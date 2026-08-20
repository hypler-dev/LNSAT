import {
  packetInspectionGatewayContract,
  type PacketInspectionGatewayResponse,
} from "@lnsat/gateway";

export const CONTROL_CENTER_PACKET_INSPECTION_STATUS = "read_only_projection";

export type ControlCenterPacketInspectionEvidenceV1 = {
  contract: "lnsat.control_center.packet_inspection.v1";
  source_kind: "gateway_fixture";
  gateway_contract_id: typeof packetInspectionGatewayContract.contract_id;
  gateway_response: PacketInspectionGatewayResponse;
  policy_decision: PacketInspectionGatewayResponse["policy_decision"];
  audit_event_preview: PacketInspectionGatewayResponse["audit_event_preview"];
  side_effects: [];
  read_only: true;
  action_authority: false;
  mutation_authority: false;
};

export function projectPacketInspectionEvidence(
  response: PacketInspectionGatewayResponse,
): ControlCenterPacketInspectionEvidenceV1 {
  return {
    contract: "lnsat.control_center.packet_inspection.v1",
    source_kind: "gateway_fixture",
    gateway_contract_id: packetInspectionGatewayContract.contract_id,
    gateway_response: response,
    policy_decision: response.policy_decision,
    audit_event_preview: response.audit_event_preview,
    side_effects: [],
    read_only: true,
    action_authority: false,
    mutation_authority: false,
  };
}
