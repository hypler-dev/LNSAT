use std::collections::VecDeque;
use std::sync::{Arc, Mutex, TryLockError};
use std::thread;
use std::time::{Duration, Instant};

const MAX_WAITERS: usize = 1024;
const LOCK_POLL_INTERVAL: Duration = Duration::from_millis(100);

/// A process-local, fail-closed admission gate for one store writer.
pub(super) struct WriterGate {
    state: Arc<Mutex<GateState>>,
}

/// A data-free denial from [`WriterGate`].
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(super) enum GateError {
    Busy,
    Poisoned,
    Quarantined,
    Limit,
}

/// An owned writer admission. Dropping it releases only its ticket.
pub(super) struct WriterPermit {
    state: Arc<Mutex<GateState>>,
    ticket: u64,
}

struct GateState {
    next_ticket: u64,
    waiters: VecDeque<u64>,
    held: Option<u64>,
    quarantined: bool,
}

impl WriterGate {
    pub(super) fn new() -> Arc<Self> {
        Arc::new(Self {
            state: Arc::new(Mutex::new(GateState {
                next_ticket: 0,
                waiters: VecDeque::new(),
                held: None,
                quarantined: false,
            })),
        })
    }

    pub(super) fn acquire(self: &Arc<Self>, deadline: Instant) -> Result<WriterPermit, GateError> {
        self.acquire_until(deadline)
    }

    /// Attempts immediate FIFO-safe admission without waiting or queueing.
    #[cfg(any(target_os = "linux", test))]
    pub(super) fn try_acquire(self: &Arc<Self>) -> Result<WriterPermit, GateError> {
        let mut state = match self.state.try_lock() {
            Ok(state) => state,
            Err(TryLockError::Poisoned(_)) => return Err(GateError::Poisoned),
            Err(TryLockError::WouldBlock) => return Err(GateError::Busy),
        };
        if !state.is_consistent() {
            state.quarantined = true;
            return Err(GateError::Quarantined);
        }
        if state.quarantined {
            return Err(GateError::Quarantined);
        }
        if state.held.is_some() || !state.waiters.is_empty() {
            return Err(GateError::Busy);
        }
        let ticket = state.take_ticket()?;
        state.held = Some(ticket);
        Ok(WriterPermit {
            state: Arc::clone(&self.state),
            ticket,
        })
    }

    fn acquire_until(&self, deadline: Instant) -> Result<WriterPermit, GateError> {
        let mut ticket = None;

        loop {
            if Instant::now() >= deadline {
                if let Some(ticket) = ticket {
                    self.cancel_ticket(ticket)?;
                }
                return Err(GateError::Busy);
            }

            match self.state.try_lock() {
                Ok(mut state) => {
                    if !state.is_consistent() {
                        state.quarantined = true;
                        return Err(GateError::Quarantined);
                    }
                    if state.quarantined {
                        return Err(GateError::Quarantined);
                    }
                    if Instant::now() >= deadline {
                        if let Some(ticket) = ticket {
                            Self::cancel_ticket_locked(&mut state, ticket)?;
                        }
                        return Err(GateError::Busy);
                    }

                    match ticket {
                        None if state.held.is_none() && state.waiters.is_empty() => {
                            let ticket = state.take_ticket()?;
                            if Instant::now() >= deadline {
                                return Err(GateError::Busy);
                            }
                            state.held = Some(ticket);
                            return Ok(WriterPermit {
                                state: Arc::clone(&self.state),
                                ticket,
                            });
                        }
                        None => {
                            if state.waiters.len() >= MAX_WAITERS {
                                return Err(GateError::Limit);
                            }
                            let next = state.take_ticket()?;
                            state.waiters.push_back(next);
                            ticket = Some(next);
                        }
                        Some(ticket)
                            if state.held.is_none() && state.waiters.front() == Some(&ticket) =>
                        {
                            if Instant::now() >= deadline {
                                Self::cancel_ticket_locked(&mut state, ticket)?;
                                return Err(GateError::Busy);
                            }
                            let removed = state.waiters.pop_front();
                            if removed != Some(ticket) {
                                state.quarantined = true;
                                return Err(GateError::Quarantined);
                            }
                            state.held = Some(ticket);
                            return Ok(WriterPermit {
                                state: Arc::clone(&self.state),
                                ticket,
                            });
                        }
                        Some(_) => {}
                    }
                }
                Err(TryLockError::Poisoned(_)) => return Err(GateError::Poisoned),
                Err(TryLockError::WouldBlock) => {}
            }

            let remaining = deadline.saturating_duration_since(Instant::now());
            if remaining.is_zero() {
                continue;
            }
            thread::sleep(remaining.min(LOCK_POLL_INTERVAL));
        }
    }

    fn cancel_ticket(&self, ticket: u64) -> Result<(), GateError> {
        let mut state = self.state.lock().map_err(|_| GateError::Poisoned)?;
        if !state.is_consistent() {
            state.quarantined = true;
            return Err(GateError::Quarantined);
        }
        Self::cancel_ticket_locked(&mut state, ticket)
    }

    fn cancel_ticket_locked(state: &mut GateState, ticket: u64) -> Result<(), GateError> {
        if let Some(index) = state.waiters.iter().position(|queued| *queued == ticket) {
            let removed = state.waiters.remove(index);
            if removed == Some(ticket) {
                Ok(())
            } else {
                state.quarantined = true;
                Err(GateError::Quarantined)
            }
        } else {
            state.quarantined = true;
            Err(GateError::Quarantined)
        }
    }
}

impl WriterPermit {
    /// Verifies that this permit remains the live gate holder without waiting.
    #[cfg(any(target_os = "linux", test))]
    pub(super) fn check_held(&self) -> Result<(), GateError> {
        let mut state = match self.state.try_lock() {
            Ok(state) => state,
            Err(TryLockError::Poisoned(_)) => return Err(GateError::Poisoned),
            Err(TryLockError::WouldBlock) => return Err(GateError::Busy),
        };
        if !state.is_consistent() {
            state.quarantined = true;
            return Err(GateError::Quarantined);
        }
        if state.quarantined {
            return Err(GateError::Quarantined);
        }
        if state.held == Some(self.ticket) {
            Ok(())
        } else {
            state.quarantined = true;
            Err(GateError::Quarantined)
        }
    }

    pub(super) fn quarantine(&mut self) -> Result<(), GateError> {
        let mut state = self.state.lock().map_err(|_| GateError::Poisoned)?;
        if !state.is_consistent() {
            state.quarantined = true;
            return Err(GateError::Quarantined);
        }
        if state.held != Some(self.ticket) {
            state.quarantined = true;
            return Err(GateError::Quarantined);
        }
        state.quarantined = true;
        Ok(())
    }
}

impl Drop for WriterPermit {
    fn drop(&mut self) {
        let Ok(mut state) = self.state.lock() else {
            return;
        };

        if state.held == Some(self.ticket) {
            state.held = None;
            if !state.is_consistent() {
                state.quarantined = true;
            }
        } else {
            state.quarantined = true;
        }
    }
}

impl GateState {
    fn take_ticket(&mut self) -> Result<u64, GateError> {
        let ticket = self.next_ticket;
        self.next_ticket = self.next_ticket.checked_add(1).ok_or(GateError::Limit)?;
        Ok(ticket)
    }

    fn is_consistent(&self) -> bool {
        if self.waiters.len() > MAX_WAITERS {
            return false;
        }
        if let Some(held) = self.held
            && held >= self.next_ticket
        {
            return false;
        }

        let mut previous = None;
        for ticket in &self.waiters {
            if *ticket >= self.next_ticket || previous.is_some_and(|prior| prior >= *ticket) {
                return false;
            }
            previous = Some(*ticket);
        }
        if let (Some(held), Some(first_waiter)) = (self.held, self.waiters.front())
            && held >= *first_waiter
        {
            return false;
        }
        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::mpsc;

    const TEST_TIMEOUT: Duration = Duration::from_secs(1);

    fn deadline() -> Instant {
        Instant::now() + TEST_TIMEOUT
    }

    fn wait_for_queue_len(gate: &WriterGate, expected: usize) {
        let deadline = Instant::now() + TEST_TIMEOUT;
        loop {
            if gate.state.lock().unwrap().waiters.len() == expected {
                return;
            }
            assert!(Instant::now() < deadline, "waiter was not admitted in time");
            thread::sleep(Duration::from_millis(1));
        }
    }

    #[test]
    fn fifo_waiters_acquire_in_ticket_order() {
        let gate = WriterGate::new();
        let owner = gate.acquire(deadline()).unwrap();
        let (started, started_rx) = mpsc::channel();
        let (acquired, acquired_rx) = mpsc::channel();

        for label in [1_u8, 2] {
            let child_gate = Arc::clone(&gate);
            let started = started.clone();
            let acquired = acquired.clone();
            thread::spawn(move || {
                started.send(label).unwrap();
                let permit = child_gate.acquire(deadline()).unwrap();
                acquired.send(label).unwrap();
                drop(permit);
            });
            started_rx.recv_timeout(TEST_TIMEOUT).unwrap();
            wait_for_queue_len(&gate, label as usize);
        }

        drop(owner);
        assert_eq!(acquired_rx.recv_timeout(TEST_TIMEOUT).unwrap(), 1);
        assert_eq!(acquired_rx.recv_timeout(TEST_TIMEOUT).unwrap(), 2);
    }

    #[test]
    fn timeout_cancellation_preserves_next_turn() {
        let gate = WriterGate::new();
        let owner = gate.acquire(deadline()).unwrap();
        let (started, started_rx) = mpsc::channel();
        let (timed_out, timed_out_rx) = mpsc::channel();
        let first = Arc::clone(&gate);
        thread::spawn(move || {
            started.send(()).unwrap();
            timed_out
                .send(first.acquire(Instant::now() + Duration::from_millis(30)))
                .unwrap();
        });
        started_rx.recv_timeout(TEST_TIMEOUT).unwrap();
        wait_for_queue_len(&gate, 1);
        assert!(matches!(
            timed_out_rx.recv_timeout(TEST_TIMEOUT).unwrap(),
            Err(GateError::Busy)
        ));
        wait_for_queue_len(&gate, 0);

        let (acquired, acquired_rx) = mpsc::channel();
        let second = Arc::clone(&gate);
        thread::spawn(move || {
            let permit = second.acquire(deadline()).unwrap();
            acquired.send(()).unwrap();
            drop(permit);
        });
        wait_for_queue_len(&gate, 1);
        drop(owner);
        acquired_rx.recv_timeout(TEST_TIMEOUT).unwrap();
    }

    #[test]
    fn expired_deadline_never_grants() {
        let gate = WriterGate::new();
        assert!(matches!(gate.acquire(Instant::now()), Err(GateError::Busy)));
        let state = gate.state.lock().unwrap();
        assert!(state.held.is_none());
        assert!(state.waiters.is_empty());
    }

    #[test]
    fn quarantine_is_terminal() {
        let gate = WriterGate::new();
        let mut permit = gate.acquire(deadline()).unwrap();
        permit.quarantine().unwrap();
        drop(permit);
        assert!(matches!(
            gate.acquire(deadline()),
            Err(GateError::Quarantined)
        ));
    }

    #[test]
    fn dropped_owner_hands_off_to_waiter() {
        let gate = WriterGate::new();
        let owner = gate.acquire(deadline()).unwrap();
        let (acquired, acquired_rx) = mpsc::channel();
        let waiter = Arc::clone(&gate);
        thread::spawn(move || {
            let permit = waiter.acquire(deadline()).unwrap();
            acquired.send(()).unwrap();
            drop(permit);
        });
        wait_for_queue_len(&gate, 1);
        drop(owner);
        acquired_rx.recv_timeout(TEST_TIMEOUT).unwrap();
    }

    #[test]
    fn queue_capacity_and_ticket_limits_are_fail_closed() {
        let gate = WriterGate::new();
        {
            let mut state = gate.state.lock().unwrap();
            state.held = Some(0);
            state.next_ticket = MAX_WAITERS as u64 + 1;
            state.waiters = (1..=MAX_WAITERS as u64).collect();
        }
        assert!(matches!(gate.acquire(deadline()), Err(GateError::Limit)));

        let ticket_limit = WriterGate::new();
        ticket_limit.state.lock().unwrap().next_ticket = u64::MAX;
        assert!(matches!(
            ticket_limit.acquire(deadline()),
            Err(GateError::Limit)
        ));
    }

    #[test]
    fn try_acquire_never_bypasses_admitted_waiters_or_reuses_tickets() {
        let gate = WriterGate::new();
        {
            let mut state = gate.state.lock().unwrap();
            state.next_ticket = 1;
            state.waiters.push_back(0);
        }
        assert!(matches!(gate.try_acquire(), Err(GateError::Busy)));
        let state = gate.state.lock().unwrap();
        assert_eq!(state.next_ticket, 1);
        assert_eq!(state.waiters, VecDeque::from([0]));
    }

    #[test]
    fn try_acquire_and_check_held_track_live_admission() {
        let gate = WriterGate::new();
        let permit = gate.try_acquire().unwrap();
        assert_eq!(permit.check_held(), Ok(()));
        assert!(matches!(gate.try_acquire(), Err(GateError::Busy)));
        drop(permit);

        let next = gate.try_acquire().unwrap();
        assert_eq!(next.ticket, 1);
        assert_eq!(next.check_held(), Ok(()));
    }

    #[test]
    fn check_held_quarantines_released_or_inconsistent_permits() {
        let gate = WriterGate::new();
        let permit = gate.try_acquire().unwrap();
        let stale = WriterPermit {
            state: Arc::clone(&permit.state),
            ticket: permit.ticket,
        };
        drop(permit);
        assert!(matches!(stale.check_held(), Err(GateError::Quarantined)));

        let inconsistent = WriterGate::new();
        let permit = inconsistent.try_acquire().unwrap();
        inconsistent
            .state
            .lock()
            .unwrap()
            .waiters
            .push_back(permit.ticket);
        assert!(matches!(permit.check_held(), Err(GateError::Quarantined)));
    }

    #[test]
    fn try_acquire_respects_quarantine_and_ticket_overflow() {
        let quarantined = WriterGate::new();
        let mut permit = quarantined.try_acquire().unwrap();
        permit.quarantine().unwrap();
        assert!(matches!(
            quarantined.try_acquire(),
            Err(GateError::Quarantined)
        ));

        let overflow = WriterGate::new();
        overflow.state.lock().unwrap().next_ticket = u64::MAX;
        assert!(matches!(overflow.try_acquire(), Err(GateError::Limit)));
    }

    #[test]
    fn inconsistent_ticket_order_or_range_quarantines_gate() {
        for waiters in [
            VecDeque::from([2, 1]),
            VecDeque::from([1, 1]),
            VecDeque::from([3]),
        ] {
            let gate = WriterGate::new();
            {
                let mut state = gate.state.lock().unwrap();
                state.next_ticket = 3;
                state.held = Some(0);
                state.waiters = waiters;
            }
            assert!(matches!(
                gate.acquire(deadline()),
                Err(GateError::Quarantined)
            ));
        }
    }

    #[test]
    fn held_gate_mutex_denies_try_apis_without_mutating_tickets() {
        let gate = WriterGate::new();
        let permit = gate.try_acquire().unwrap();
        let state = gate.state.lock().unwrap();
        let next = state.next_ticket;
        let start = Instant::now();
        assert!(matches!(gate.try_acquire(), Err(GateError::Busy)));
        assert_eq!(permit.check_held(), Err(GateError::Busy));
        assert!(start.elapsed() < TEST_TIMEOUT);
        assert_eq!(state.next_ticket, next);
        assert!(state.waiters.is_empty());
        assert_eq!(state.held, Some(permit.ticket));
        drop(state);
        assert_eq!(permit.check_held(), Ok(()));
    }

    #[test]
    fn poisoned_gate_mutex_denies_try_apis_without_recovery() {
        let gate = WriterGate::new();
        let permit = gate.try_acquire().unwrap();
        let result = std::panic::catch_unwind(|| {
            let _held = gate.state.lock().unwrap();
            panic!("isolated gate poison fixture");
        });
        assert!(result.is_err());
        assert!(matches!(gate.try_acquire(), Err(GateError::Poisoned)));
        assert_eq!(permit.check_held(), Err(GateError::Poisoned));
        assert!(gate.state.is_poisoned());
    }
}
