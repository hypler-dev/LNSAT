//! Independent synthetic vectors and rejection matrices for private Stage-A codecs.

use super::*;
use serde_json::{Map, Value, json};
use sha2::{Digest, Sha256};
use std::fmt::Write as _;

const ACTION_OBSERVATION: &str = "eyJjb250ZXh0Ijp7ImF0dGVtcHRfc2VxdWVuY2UiOjEsImF1dGhvcml0eV9lcG9jaCI6MSwiYXV0aG9yaXphdGlvbl9pZCI6InhhdV8yMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyIiwiY2FuZGlkYXRlX2RpZ2VzdCI6InNoYTI1NjphYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhIiwiY2hhbGxlbmdlIjoiZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZCIsImNoYW5uZWxfaWQiOiJjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjIiwiY29udGFpbmVyX2lkIjoiZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZiIsImdlbmVyYXRpb24iOjEsImluc3RhbGxhdGlvbl9pZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsIm9wZXJhdGlvbl9pZCI6Im9wbl8xMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExIiwicHJvZmlsZV9kaWdlc3QiOiJzaGEyNTY6YmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYiIsInJlY2lwZV9kaWdlc3QiOiJzaGEyNTY6Y2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjYyJ9LCJjb250cmFjdF9pZCI6Imxuc2F0LmFkYXB0ZXJfcHJvY2Vzcy5kb2NrZXJfbG9jYWwudjIiLCJjb250cmFjdF92ZXJzaW9uIjoibG5zYXQuY29udHJhY3RzLnYxXzAiLCJtZXNzYWdlX3R5cGUiOiJzdGFydHVwX29ic2VydmF0aW9uIiwicGF5bG9hZCI6eyJuYXRpdmUiOnsiY2dyb3VwIjp7ImNvbnRyb2xsZXJzIjpbImNwdSIsIm1lbW9yeSIsInBpZHMiXSwiY3B1X2J1cnN0IjowLCJjcHVfcGVyaW9kIjoxMDAwMDAsImNwdV9xdW90YSI6MTAwMCwiZGlyZWN0b3J5X2RldmljZSI6NDEsImRpcmVjdG9yeV9pbm9kZSI6NDIsIm1lbWJlcnNoaXBfcGF0aCI6Ii9zeXMvZnMvY2dyb3VwIiwibWVtb3J5X21heCI6MTY3NzcyMTYsIm1lbW9yeV9vb21fZ3JvdXAiOjAsIm1lbW9yeV9zd2FwX21heCI6MCwibW91bnRfaWQiOjQwLCJwaWRzX21heCI6MX0sImRldmljZXMiOltdLCJrZXJuZWwiOnsiYm9vdF9pZCI6IjAwMDAwMDAwLTAwMDAtNDAwMC04MDAwLTAwMDAwMDAwMDAwMCIsImNncm91cGZzX2RldmljZSI6NTEsImtlcm5lbF9yZWNpcGVfZGlnZXN0Ijoic2hhMjU2OjMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMiLCJwcm9jZnNfZGV2aWNlIjo1MH0sIm1hcHBpbmciOnsiZ2lkX21hcCI6W1swLDAsNDI5NDk2NzI5NV1dLCJ1aWRfbWFwIjpbWzAsMCw0Mjk0OTY3Mjk1XV19LCJtb3VudHMiOlt7ImRldmljZV9tYWpvciI6OCwiZGV2aWNlX21pbm9yIjoxLCJmaWxlc3lzdGVtX3R5cGUiOiJleHQ0IiwibW91bnRfaWQiOjMyLCJtb3VudF9vcHRpb25zIjpbInJ3Il0sIm1vdW50X3BvaW50IjoiL3dvcmsiLCJtb3VudF9zb3VyY2UiOiIvZGV2L3NkYTEiLCJvcHRpb25hbF9maWVsZHMiOltdLCJwYXJlbnRfaWQiOjEsInJvb3QiOiIvIiwic3VwZXJfb3B0aW9ucyI6WyJydyJdfV0sIm5hbWVzcGFjZXMiOnsiY2dyb3VwIjp7ImRldmljZSI6MTYsImlub2RlIjoyNn0sImlwYyI6eyJkZXZpY2UiOjEzLCJpbm9kZSI6MjN9LCJtb3VudCI6eyJkZXZpY2UiOjExLCJpbm9kZSI6MjF9LCJuZXR3b3JrIjp7ImRldmljZSI6MTQsImlub2RlIjoyNH0sInBpZCI6eyJkZXZpY2UiOjEyLCJpbm9kZSI6MjJ9LCJ0aW1lIjp7ImRldmljZSI6MTcsImlub2RlIjoyN30sInVzZXIiOnsiZGV2aWNlIjoxMCwiaW5vZGUiOjIwfSwidXRzIjp7ImRldmljZSI6MTUsImlub2RlIjoyNX19LCJwcm9jZXNzIjp7ImNhcF9hbWJpZW50IjoiMDAwMDAwMDAwMDAwMDAwMCIsImNhcF9ib3VuZGluZyI6IjAwMDAwMDAwMDAwMDAwMDAiLCJjYXBfZWZmZWN0aXZlIjoiMDAwMDAwMDAwMDAwMDAwMCIsImNhcF9pbmhlcml0YWJsZSI6IjAwMDAwMDAwMDAwMDAwMDAiLCJjYXBfcGVybWl0dGVkIjoiMDAwMDAwMDAwMDAwMDAwMCIsImVudmlyb25tZW50IjpbIlBBVEg9L3Vzci9iaW4iLCJIT1NUTkFNRT1sbnNhdCIsIkxBTkc9QyIsIkxDX0FMTD1DIiwiSE9NRT0vbm9uZXhpc3RlbnQiLCJHSVRfQ09ORklHX05PU1lTVEVNPTEiLCJHSVRfQ09ORklHX0dMT0JBTD0vZGV2L251bGwiLCJHSVRfVEVSTUlOQUxfUFJPTVBUPTAiLCJHSVRfTk9fUkVQTEFDRV9PQkpFQ1RTPTEiLCJHSVRfQVRUUl9OT1NZU1RFTT0xIl0sImV4ZWN1dGFibGVfZGlnZXN0Ijoic2hhMjU2OjExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTEiLCJnaWRzIjpbMTAwMCwxMDAwLDEwMDAsMTAwMF0sImdyb3VwcyI6WzEwMDBdLCJpbmhlcml0ZWRfZmRzIjpbMCwxLDJdLCJub19uZXdfcHJpdmlsZWdlcyI6MSwicGlkIjoxLCJzY2hlZHVsZXJfcG9saWN5IjowLCJzZWNjb21wX21vZGUiOjIsInN0YXJ0X3RpY2tzIjoyLCJ0aHJlYWRfY291bnQiOjEsInVpZHMiOlsxMDAwLDEwMDAsMTAwMCwxMDAwXX0sInNlY3VyaXR5Ijp7ImFwcGFybW9yX2xhYmVsIjoic3ludGhldGljIiwibmV0d29ya19pbnRlcmZhY2VzIjpbXSwic2VjdXJpdHlfcmVjaXBlX2RpZ2VzdCI6InNoYTI1NjoyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyIn0sInRhcmdldCI6eyJkZXNjcmlwdG9yX2FjY2VzcyI6InJlYWRfb25seV9tZXRhZGF0YSIsImRlc2NyaXB0b3JfY2xvZXhlYyI6dHJ1ZSwiZGV2aWNlIjozMCwiaW5vZGUiOjMxLCJtb3VudF9pZCI6MzIsIm1vdW50X3BhdGgiOiIvd29yayIsIm93bmVyX2dpZCI6MTAwMCwib3duZXJfdWlkIjoxMDAwfX0sIm9ic2VydmF0aW9uX2RpZ2VzdCI6InNoYTI1NjowMzc0NzE4NjQ3OWExNmU2NmMzMmFkZTIyMGQwZjI1ODgzOGYyYTMxOWU0M2ZlOWExZmQyNDkyMzc2MDVlNTdiIiwic3RhcnR1cF9kaWdlc3QiOiJzaGEyNTY6ZmM0ZWQ1NGU2ZjUxMjBmYzEwYmEyNWZhZjc5OTY1YzAzZTMyOTlmNjBkNzVlNjQzOTcyZDMzNDQwYzNjODgyOSJ9LCJzY2hlbWFfdmVyc2lvbiI6Mn0K";
const PREPARATION_13: &str = "eyJjb250ZXh0Ijp7ImNhbmRpZGF0ZV9kaWdlc3QiOiJzaGEyNTY6YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYSIsImNoYWxsZW5nZSI6Ijk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTkiLCJjaGFubmVsX2lkIjoiY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjYyIsImNvbnRhaW5lcl9pZCI6ImZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmYiLCJwcmVwYXJhdGlvbl9pZCI6ImVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWUiLCJwcm9maWxlX2RpZ2VzdCI6InNoYTI1NjpiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiIiwicmVjaXBlX2RpZ2VzdCI6InNoYTI1NjpjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjIn0sImNvbnRyYWN0X2lkIjoibG5zYXQucHJlcGFyYXRpb25fcHJvYmUuZG9ja2VyX2xvY2FsLnYxIiwiY29udHJhY3RfdmVyc2lvbiI6Imxuc2F0LmNvbnRyYWN0cy52MV8wIiwibWVzc2FnZV90eXBlIjoicHJvYmVfb2JzZXJ2YXRpb24iLCJwYXlsb2FkIjp7Im5hdGl2ZSI6eyJjZ3JvdXAiOnsiY29udHJvbGxlcnMiOlsiY3B1IiwibWVtb3J5IiwicGlkcyJdLCJjcHVfYnVyc3QiOjAsImNwdV9wZXJpb2QiOjEwMDAwMCwiY3B1X3F1b3RhIjoxMDAwLCJkaXJlY3RvcnlfZGV2aWNlIjo0MSwiZGlyZWN0b3J5X2lub2RlIjo0MiwibWVtYmVyc2hpcF9wYXRoIjoiL3N5cy9mcy9jZ3JvdXAiLCJtZW1vcnlfbWF4IjoxNjc3NzIxNiwibWVtb3J5X29vbV9ncm91cCI6MCwibWVtb3J5X3N3YXBfbWF4IjowLCJtb3VudF9pZCI6NDAsInBpZHNfbWF4IjoxfSwiZGV2aWNlcyI6W10sImtlcm5lbCI6eyJib290X2lkIjoiMDAwMDAwMDAtMDAwMC00MDAwLTgwMDAtMDAwMDAwMDAwMDAwIiwiY2dyb3VwZnNfZGV2aWNlIjo1MSwia2VybmVsX3JlY2lwZV9kaWdlc3QiOiJzaGEyNTY6MzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMyIsInByb2Nmc19kZXZpY2UiOjUwfSwibWFwcGluZyI6eyJnaWRfbWFwIjpbWzAsMCw0Mjk0OTY3Mjk1XV0sInVpZF9tYXAiOltbMCwwLDQyOTQ5NjcyOTVdXX0sIm1vdW50cyI6W3siZGV2aWNlX21ham9yIjo4LCJkZXZpY2VfbWlub3IiOjEsImZpbGVzeXN0ZW1fdHlwZSI6ImV4dDQiLCJtb3VudF9pZCI6MzIsIm1vdW50X29wdGlvbnMiOlsicnciXSwibW91bnRfcG9pbnQiOiIvd29yayIsIm1vdW50X3NvdXJjZSI6Ii9kZXYvc2RhMSIsIm9wdGlvbmFsX2ZpZWxkcyI6W10sInBhcmVudF9pZCI6MSwicm9vdCI6Ii8iLCJzdXBlcl9vcHRpb25zIjpbInJ3Il19XSwibmFtZXNwYWNlcyI6eyJjZ3JvdXAiOnsiZGV2aWNlIjoxNiwiaW5vZGUiOjI2fSwiaXBjIjp7ImRldmljZSI6MTMsImlub2RlIjoyM30sIm1vdW50Ijp7ImRldmljZSI6MTEsImlub2RlIjoyMX0sIm5ldHdvcmsiOnsiZGV2aWNlIjoxNCwiaW5vZGUiOjI0fSwicGlkIjp7ImRldmljZSI6MTIsImlub2RlIjoyMn0sInRpbWUiOnsiZGV2aWNlIjoxNywiaW5vZGUiOjI3fSwidXNlciI6eyJkZXZpY2UiOjEwLCJpbm9kZSI6MjB9LCJ1dHMiOnsiZGV2aWNlIjoxNSwiaW5vZGUiOjI1fX0sInByb2Nlc3MiOnsiY2FwX2FtYmllbnQiOiIwMDAwMDAwMDAwMDAwMDAwIiwiY2FwX2JvdW5kaW5nIjoiMDAwMDAwMDAwMDAwMDAwMCIsImNhcF9lZmZlY3RpdmUiOiIwMDAwMDAwMDAwMDAwMDAwIiwiY2FwX2luaGVyaXRhYmxlIjoiMDAwMDAwMDAwMDAwMDAwMCIsImNhcF9wZXJtaXR0ZWQiOiIwMDAwMDAwMDAwMDAwMDAwIiwiZW52aXJvbm1lbnQiOlsiUEFUSD0vdXNyL2JpbiIsIkhPU1ROQU1FPWxuc2F0IiwiTEFORz1DIiwiTENfQUxMPUMiLCJIT01FPS9ub25leGlzdGVudCIsIkdJVF9DT05GSUdfTk9TWVNURU09MSIsIkdJVF9DT05GSUdfR0xPQkFMPS9kZXYvbnVsbCIsIkdJVF9URVJNSU5BTF9QUk9NUFQ9MCIsIkdJVF9OT19SRVBMQUNFX09CSkVDVFM9MSIsIkdJVF9BVFRSX05PU1lTVEVNPTEiXSwiZXhlY3V0YWJsZV9kaWdlc3QiOiJzaGEyNTY6MTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMSIsImdpZHMiOlsxMDAwLDEwMDAsMTAwMCwxMDAwXSwiZ3JvdXBzIjpbMTAwMF0sImluaGVyaXRlZF9mZHMiOlswLDEsMl0sIm5vX25ld19wcml2aWxlZ2VzIjoxLCJwaWQiOjEsInNjaGVkdWxlcl9wb2xpY3kiOjAsInNlY2NvbXBfbW9kZSI6Miwic3RhcnRfdGlja3MiOjIsInRocmVhZF9jb3VudCI6MSwidWlkcyI6WzEwMDAsMTAwMCwxMDAwLDEwMDBdfSwic2VjdXJpdHkiOnsiYXBwYXJtb3JfbGFiZWwiOiJzeW50aGV0aWMiLCJuZXR3b3JrX2ludGVyZmFjZXMiOltdLCJzZWN1cml0eV9yZWNpcGVfZGlnZXN0Ijoic2hhMjU2OjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIifSwidGFyZ2V0IjpudWxsfSwibmVnYXRpdmVfY2hlY2tzIjpbeyJlcnJubyI6MSwiaWQiOiJtb3VudF90bXBmc19yb290In0seyJlcnJubyI6MSwiaWQiOiJ1bnNoYXJlX21vdW50X25hbWVzcGFjZSJ9LHsiZXJybm8iOjEsImlkIjoic2V0dWlkX3Jvb3QifSx7ImVycm5vIjoxMywiaWQiOiJjcmVhdGVfcm9vdF9zZW50aW5lbCJ9LHsiZXJybm8iOjEwMSwiaWQiOiJjb25uZWN0X3Rlc3RfbmV0In1dLCJvYnNlcnZhdGlvbl9kaWdlc3QiOiJzaGEyNTY6ZjgxNWEzMThlYzYwMTZkNGMxNmJkMjI1MTJlMGM1Njg3OTU1YmI2ZWFkYWUxOWQwOWI5MjZjMjg2MTIwZTI4NSIsInN0YXJ0dXBfZGlnZXN0Ijoic2hhMjU2OmQ5NTBlYjQ5ZTYxMzMzNzEzNjhlNzRjMjAyZDM4MDU3MDQ0MmEwOTU4NDk0MTBlZGIzYzU4ZjJiOGYxMWViMWUifSwic2NoZW1hX3ZlcnNpb24iOjF9Cg==";
const PREPARATION_30: &str = "eyJjb250ZXh0Ijp7ImNhbmRpZGF0ZV9kaWdlc3QiOiJzaGEyNTY6YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYSIsImNoYWxsZW5nZSI6Ijk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTkiLCJjaGFubmVsX2lkIjoiY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjYyIsImNvbnRhaW5lcl9pZCI6ImZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmYiLCJwcmVwYXJhdGlvbl9pZCI6ImVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWUiLCJwcm9maWxlX2RpZ2VzdCI6InNoYTI1NjpiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiIiwicmVjaXBlX2RpZ2VzdCI6InNoYTI1NjpjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjIn0sImNvbnRyYWN0X2lkIjoibG5zYXQucHJlcGFyYXRpb25fcHJvYmUuZG9ja2VyX2xvY2FsLnYxIiwiY29udHJhY3RfdmVyc2lvbiI6Imxuc2F0LmNvbnRyYWN0cy52MV8wIiwibWVzc2FnZV90eXBlIjoicHJvYmVfb2JzZXJ2YXRpb24iLCJwYXlsb2FkIjp7Im5hdGl2ZSI6eyJjZ3JvdXAiOnsiY29udHJvbGxlcnMiOlsiY3B1IiwibWVtb3J5IiwicGlkcyJdLCJjcHVfYnVyc3QiOjAsImNwdV9wZXJpb2QiOjEwMDAwMCwiY3B1X3F1b3RhIjoxMDAwLCJkaXJlY3RvcnlfZGV2aWNlIjo0MSwiZGlyZWN0b3J5X2lub2RlIjo0MiwibWVtYmVyc2hpcF9wYXRoIjoiL3N5cy9mcy9jZ3JvdXAiLCJtZW1vcnlfbWF4IjoxNjc3NzIxNiwibWVtb3J5X29vbV9ncm91cCI6MCwibWVtb3J5X3N3YXBfbWF4IjowLCJtb3VudF9pZCI6NDAsInBpZHNfbWF4IjoxfSwiZGV2aWNlcyI6W10sImtlcm5lbCI6eyJib290X2lkIjoiMDAwMDAwMDAtMDAwMC00MDAwLTgwMDAtMDAwMDAwMDAwMDAwIiwiY2dyb3VwZnNfZGV2aWNlIjo1MSwia2VybmVsX3JlY2lwZV9kaWdlc3QiOiJzaGEyNTY6MzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMyIsInByb2Nmc19kZXZpY2UiOjUwfSwibWFwcGluZyI6eyJnaWRfbWFwIjpbWzAsMCw0Mjk0OTY3Mjk1XV0sInVpZF9tYXAiOltbMCwwLDQyOTQ5NjcyOTVdXX0sIm1vdW50cyI6W3siZGV2aWNlX21ham9yIjo4LCJkZXZpY2VfbWlub3IiOjEsImZpbGVzeXN0ZW1fdHlwZSI6ImV4dDQiLCJtb3VudF9pZCI6MzIsIm1vdW50X29wdGlvbnMiOlsicnciXSwibW91bnRfcG9pbnQiOiIvd29yayIsIm1vdW50X3NvdXJjZSI6Ii9kZXYvc2RhMSIsIm9wdGlvbmFsX2ZpZWxkcyI6W10sInBhcmVudF9pZCI6MSwicm9vdCI6Ii8iLCJzdXBlcl9vcHRpb25zIjpbInJ3Il19XSwibmFtZXNwYWNlcyI6eyJjZ3JvdXAiOnsiZGV2aWNlIjoxNiwiaW5vZGUiOjI2fSwiaXBjIjp7ImRldmljZSI6MTMsImlub2RlIjoyM30sIm1vdW50Ijp7ImRldmljZSI6MTEsImlub2RlIjoyMX0sIm5ldHdvcmsiOnsiZGV2aWNlIjoxNCwiaW5vZGUiOjI0fSwicGlkIjp7ImRldmljZSI6MTIsImlub2RlIjoyMn0sInRpbWUiOnsiZGV2aWNlIjoxNywiaW5vZGUiOjI3fSwidXNlciI6eyJkZXZpY2UiOjEwLCJpbm9kZSI6MjB9LCJ1dHMiOnsiZGV2aWNlIjoxNSwiaW5vZGUiOjI1fX0sInByb2Nlc3MiOnsiY2FwX2FtYmllbnQiOiIwMDAwMDAwMDAwMDAwMDAwIiwiY2FwX2JvdW5kaW5nIjoiMDAwMDAwMDAwMDAwMDAwMCIsImNhcF9lZmZlY3RpdmUiOiIwMDAwMDAwMDAwMDAwMDAwIiwiY2FwX2luaGVyaXRhYmxlIjoiMDAwMDAwMDAwMDAwMDAwMCIsImNhcF9wZXJtaXR0ZWQiOiIwMDAwMDAwMDAwMDAwMDAwIiwiZW52aXJvbm1lbnQiOlsiUEFUSD0vdXNyL2JpbiIsIkhPU1ROQU1FPWxuc2F0IiwiTEFORz1DIiwiTENfQUxMPUMiLCJIT01FPS9ub25leGlzdGVudCIsIkdJVF9DT05GSUdfTk9TWVNURU09MSIsIkdJVF9DT05GSUdfR0xPQkFMPS9kZXYvbnVsbCIsIkdJVF9URVJNSU5BTF9QUk9NUFQ9MCIsIkdJVF9OT19SRVBMQUNFX09CSkVDVFM9MSIsIkdJVF9BVFRSX05PU1lTVEVNPTEiXSwiZXhlY3V0YWJsZV9kaWdlc3QiOiJzaGEyNTY6MTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMSIsImdpZHMiOlsxMDAwLDEwMDAsMTAwMCwxMDAwXSwiZ3JvdXBzIjpbMTAwMF0sImluaGVyaXRlZF9mZHMiOlswLDEsMl0sIm5vX25ld19wcml2aWxlZ2VzIjoxLCJwaWQiOjEsInNjaGVkdWxlcl9wb2xpY3kiOjAsInNlY2NvbXBfbW9kZSI6Miwic3RhcnRfdGlja3MiOjIsInRocmVhZF9jb3VudCI6MSwidWlkcyI6WzEwMDAsMTAwMCwxMDAwLDEwMDBdfSwic2VjdXJpdHkiOnsiYXBwYXJtb3JfbGFiZWwiOiJzeW50aGV0aWMiLCJuZXR3b3JrX2ludGVyZmFjZXMiOltdLCJzZWN1cml0eV9yZWNpcGVfZGlnZXN0Ijoic2hhMjU2OjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIifSwidGFyZ2V0IjpudWxsfSwibmVnYXRpdmVfY2hlY2tzIjpbeyJlcnJubyI6MSwiaWQiOiJtb3VudF90bXBmc19yb290In0seyJlcnJubyI6MSwiaWQiOiJ1bnNoYXJlX21vdW50X25hbWVzcGFjZSJ9LHsiZXJybm8iOjEsImlkIjoic2V0dWlkX3Jvb3QifSx7ImVycm5vIjozMCwiaWQiOiJjcmVhdGVfcm9vdF9zZW50aW5lbCJ9LHsiZXJybm8iOjEwMSwiaWQiOiJjb25uZWN0X3Rlc3RfbmV0In1dLCJvYnNlcnZhdGlvbl9kaWdlc3QiOiJzaGEyNTY6ODdhMzU5ZTA2MDA1OGUzMWZkNTJkZjFhY2I3NDljNTE2MGRkZWI0NGMwNWE2MmVhYTgyMjdiMjJiYzk4ZWU2ZCIsInN0YXJ0dXBfZGlnZXN0Ijoic2hhMjU2OmQ5NTBlYjQ5ZTYxMzMzNzEzNjhlNzRjMjAyZDM4MDU3MDQ0MmEwOTU4NDk0MTBlZGIzYzU4ZjJiOGYxMWViMWUifSwic2NoZW1hX3ZlcnNpb24iOjF9Cg==";
const ACTION_RELEASE: &str = "eyJjb250ZXh0Ijp7ImF0dGVtcHRfc2VxdWVuY2UiOjEsImF1dGhvcml0eV9lcG9jaCI6MSwiYXV0aG9yaXphdGlvbl9pZCI6InhhdV8yMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyIiwiY2FuZGlkYXRlX2RpZ2VzdCI6InNoYTI1NjphYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhIiwiY2hhbGxlbmdlIjoiZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZCIsImNoYW5uZWxfaWQiOiJjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjIiwiY29udGFpbmVyX2lkIjoiZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZiIsImdlbmVyYXRpb24iOjEsImluc3RhbGxhdGlvbl9pZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsIm9wZXJhdGlvbl9pZCI6Im9wbl8xMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExIiwicHJvZmlsZV9kaWdlc3QiOiJzaGEyNTY6YmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYiIsInJlY2lwZV9kaWdlc3QiOiJzaGEyNTY6Y2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjYyJ9LCJjb250cmFjdF9pZCI6Imxuc2F0LmFkYXB0ZXJfcHJvY2Vzcy5kb2NrZXJfbG9jYWwudjIiLCJjb250cmFjdF92ZXJzaW9uIjoibG5zYXQuY29udHJhY3RzLnYxXzAiLCJtZXNzYWdlX3R5cGUiOiJhY3Rpb25fcmVsZWFzZSIsInBheWxvYWQiOnsiZXhlY3V0aW9uX3JlcXVlc3QiOnsiYWN0aW9uIjp7ImFyZ3VtZW50cyI6eyJhbGxvd2VkX3BhdGhzIjpbImZpeHR1cmUudHh0Il0sImJhc2VfY29tbWl0X29pZCI6IjExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTEiLCJjb21taXRfbWV0YWRhdGEiOnsiYXV0aG9yX2VtYWlsIjoiYXV0aG9yQGV4YW1wbGUuaW52YWxpZCIsImF1dGhvcl9uYW1lIjoiRml4dHVyZSBBdXRob3IiLCJhdXRob3JfdGltZSI6IjEgKzAwMDAiLCJjb21taXR0ZXJfZW1haWwiOiJjb21taXR0ZXJAZXhhbXBsZS5pbnZhbGlkIiwiY29tbWl0dGVyX25hbWUiOiJGaXh0dXJlIENvbW1pdHRlciIsImNvbW1pdHRlcl90aW1lIjoiMiArMDAwMCIsIm1lc3NhZ2UiOiJCb3VuZGVkIGZpeHR1cmUgY29tbWl0XG4ifSwiZXhwZWN0ZWRfdHJlZV9vaWQiOiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyIiwiaGVhZF9yZWYiOiJyZWZzL2hlYWRzL21haW4iLCJwYXRjaCI6ImRpZmYgLS1naXQgYS9maXh0dXJlLnR4dCBiL2ZpeHR1cmUudHh0XG4tLS0gYS9maXh0dXJlLnR4dFxuKysrIGIvZml4dHVyZS50eHRcbkBAIC0xICsxIEBAXG4tYmVmb3JlXG4rYWZ0ZXJcbiIsInBhdGNoX3NoYTI1NiI6InNoYTI1Njo2ZTgzZTMwNDQ4ZmNhM2FmNjAzZDUxYWNkYjc3ZWMxNjkyMDkxZWMyZTU4MGY5NjMwZmVlMTEyYjI2MjBlOGYwIiwic2NoZW1hX2lkIjoibG5zYXQuZ2l0X2NvbW1pdF9hY3Rpb24uc2NoZW1hLnYxIn0sImtpbmQiOiJnaXQuY29tbWl0In0sImFkYXB0ZXIiOnsicmVmIjoiYWRhcHRlcjpkb2NrZXItbG9jYWw6Z2l0LWNvbW1pdCIsInZlcnNpb24iOiJ2MiJ9LCJhcHByb3ZhbF9kZWNpc2lvbl9yZWYiOnsiYXBwcm92YWxfZGVjaXNpb25faWQiOiJhcGRfMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMyIsInNjaGVtYV9pZCI6Imxuc2F0LmFwcHJvdmFsX2RlY2lzaW9uLnNjaGVtYS52MV8wIn0sImFwcHJvdmFsX3JlcXVlc3RfcmVmIjp7ImFwcHJvdmFsX3JlcXVlc3RfaWQiOiJhcHJfMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMiIsInNjaGVtYV9pZCI6Imxuc2F0LmFwcHJvdmFsX3JlcXVlc3Quc2NoZW1hLnYxXzAifSwiYXBwcm92ZXJfcmVmIjoiaWRlbnRpdHk6aHVtYW46b3duZXIiLCJhcHByb3Zlcl9zZXNzaW9uX3JlZiI6InNlc3Npb246bG9jYWw6b3duZXIiLCJhdWRpZW5jZSI6ImF1ZGllbmNlOmdhdGV3YXk6bG9jYWwiLCJjb25maWd1cmF0aW9uX2RpZ2VzdCI6InNoYTI1NjpjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjIiwiY29udHJhY3RfdmVyc2lvbiI6Imxuc2F0LmNvbnRyYWN0cy52MV8wIiwiZGVyaXZhdGlvbl9wcm9maWxlIjoibG5zYXQuZXhlY3V0aW9uX3JlcXVlc3QucGFja2V0X2VtYmVkZGVkLnYxIiwiZXhlY3V0YWJsZV9kaWdlc3QiOiJzaGEyNTY6ZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZWVlZSIsImV4cGlyZXNfYXQiOiIyMDI2LTA3LTIyVDIwOjA1OjAwLjAwMFoiLCJwYWNrZXRfcmVmIjp7InBhY2tldF9pZCI6InBrdF8wMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwIiwicGFja2V0X3NoYTI1NiI6InNoYTI1Njo5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5Iiwic2NoZW1hX2lkIjoibG5zYXQucGFja2V0X2VudmVsb3BlLnNjaGVtYS52MV8wIn0sInBvbGljeV9kZWNpc2lvbl9yZWYiOnsiZGVjaXNpb25faWQiOiJwb2xfMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMSIsInNjaGVtYV9pZCI6Imxuc2F0LnBvbGljeV9kZWNpc2lvbi5zY2hlbWEudjFfMCJ9LCJwcmVwYXJlZF9hdCI6IjIwMjYtMDctMjJUMjA6MDM6MDAuMDAwWiIsInByb2plY3RfcmVmIjoicHJvamVjdDpmaXh0dXJlIiwicmVxdWVzdGVyX3JlZiI6ImlkZW50aXR5OmFnZW50OmZpeHR1cmUiLCJyZXF1ZXN0ZXJfc2Vzc2lvbl9yZWYiOiJzZXNzaW9uOmxvY2FsOnJlcXVlc3RlciIsInJlc291cmNlX3JlZiI6InJlcG86Zml4dHVyZSIsInNjaGVtYV9pZCI6Imxuc2F0LmV4ZWN1dGlvbl9yZXF1ZXN0LnNjaGVtYS52MV8wIiwidGFyZ2V0Ijp7ImlkZW50aXR5Ijp7ImJhc2VfY29tbWl0X29pZCI6IjExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTEiLCJmaXh0dXJlX21hcmtlcl9zaGEyNTYiOiJzaGEyNTY6ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4OCIsImdpdF9kaXJfcGF0aCI6Ii9maXh0dXJlL3JlcG9zaXRvcnkvLmdpdCIsImhlYWRfcmVmIjoicmVmcy9oZWFkcy9tYWluIiwib2JqZWN0X2Zvcm1hdCI6InNoYTEiLCJyZXBvc2l0b3J5X3BhdGgiOiIvZml4dHVyZS9yZXBvc2l0b3J5Iiwic2NoZW1hX2lkIjoibG5zYXQuZGlzcG9zYWJsZV9naXRfcmVwb3NpdG9yeS5zY2hlbWEudjEifSwicmVzb3VyY2VfcmVmIjoicmVwbzpmaXh0dXJlIn19LCJvYnNlcnZhdGlvbl9kaWdlc3QiOiJzaGEyNTY6MDM3NDcxODY0NzlhMTZlNjZjMzJhZGUyMjBkMGYyNTg4MzhmMmEzMTllNDNmZTlhMWZkMjQ5MjM3NjA1ZTU3YiIsInJlbGVhc2VfYXVkaXRfZGlnZXN0Ijoic2hhMjU2OjQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQiLCJyZWxlYXNlX2lkIjoiNTUwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAxIiwicmVwb3NpdG9yeV9tb3VudF9wYXRoIjoiL3dvcmsiLCJzdGFydHVwX2RpZ2VzdCI6InNoYTI1NjpmYzRlZDU0ZTZmNTEyMGZjMTBiYTI1ZmFmNzk5NjVjMDNlMzI5OWY2MGQ3NWU2NDM5NzJkMzM0NDBjM2M4ODI5IiwidGFyZ2V0X2RpZ2VzdCI6InNoYTI1Njo3N2VlNTc2Y2ZjZGNmZjg5MzVkZjI0Zjg4NGNjODQ1ZTRkMzQ2MDhhZGI4YmRiMzhiNTVmMGM4YzYxNTBiZDZjIiwidG9vbF9hcmd1bWVudHNfZGlnZXN0Ijoic2hhMjU2OmM0MDdkNWM4NjQxOGI3MGJiOTdjZmVkYTQxYTgwODQwYWM1NWUzMWJkYmJkZjE5YWQ5YTcyYjZhYTkzYjgzMGQifSwic2NoZW1hX3ZlcnNpb24iOjJ9Cg==";
const RESULT_COMPLETED: &str = "eyJjb250ZXh0Ijp7ImF0dGVtcHRfc2VxdWVuY2UiOjEsImF1dGhvcml0eV9lcG9jaCI6MSwiYXV0aG9yaXphdGlvbl9pZCI6InhhdV8yMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyIiwiY2FuZGlkYXRlX2RpZ2VzdCI6InNoYTI1NjphYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhIiwiY2hhbGxlbmdlIjoiZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZCIsImNoYW5uZWxfaWQiOiJjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjIiwiY29udGFpbmVyX2lkIjoiZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZiIsImdlbmVyYXRpb24iOjEsImluc3RhbGxhdGlvbl9pZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsIm9wZXJhdGlvbl9pZCI6Im9wbl8xMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExIiwicHJvZmlsZV9kaWdlc3QiOiJzaGEyNTY6YmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYiIsInJlY2lwZV9kaWdlc3QiOiJzaGEyNTY6Y2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjYyJ9LCJjb250cmFjdF9pZCI6Imxuc2F0LmFkYXB0ZXJfcHJvY2Vzcy5kb2NrZXJfbG9jYWwudjIiLCJjb250cmFjdF92ZXJzaW9uIjoibG5zYXQuY29udHJhY3RzLnYxXzAiLCJtZXNzYWdlX3R5cGUiOiJhY3Rpb25fcmVzdWx0IiwicGF5bG9hZCI6eyJvdXRjb21lIjoiY29tcGxldGVkIiwicmVsZWFzZV9hdWRpdF9kaWdlc3QiOiJzaGEyNTY6NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NCIsInJlbGVhc2VfaWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDEiLCJyZXN1bHRfZGlnZXN0Ijoic2hhMjU2Ojc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3NzcifSwic2NoZW1hX3ZlcnNpb24iOjJ9Cg==";
const RESULT_UNKNOWN: &str = "eyJjb250ZXh0Ijp7ImF0dGVtcHRfc2VxdWVuY2UiOjEsImF1dGhvcml0eV9lcG9jaCI6MSwiYXV0aG9yaXphdGlvbl9pZCI6InhhdV8yMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyIiwiY2FuZGlkYXRlX2RpZ2VzdCI6InNoYTI1NjphYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhIiwiY2hhbGxlbmdlIjoiZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZCIsImNoYW5uZWxfaWQiOiJjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjIiwiY29udGFpbmVyX2lkIjoiZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZiIsImdlbmVyYXRpb24iOjEsImluc3RhbGxhdGlvbl9pZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsIm9wZXJhdGlvbl9pZCI6Im9wbl8xMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExIiwicHJvZmlsZV9kaWdlc3QiOiJzaGEyNTY6YmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYiIsInJlY2lwZV9kaWdlc3QiOiJzaGEyNTY6Y2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjYyJ9LCJjb250cmFjdF9pZCI6Imxuc2F0LmFkYXB0ZXJfcHJvY2Vzcy5kb2NrZXJfbG9jYWwudjIiLCJjb250cmFjdF92ZXJzaW9uIjoibG5zYXQuY29udHJhY3RzLnYxXzAiLCJtZXNzYWdlX3R5cGUiOiJhY3Rpb25fcmVzdWx0IiwicGF5bG9hZCI6eyJvdXRjb21lIjoib3V0Y29tZV91bmtub3duIiwicmVsZWFzZV9hdWRpdF9kaWdlc3QiOiJzaGEyNTY6NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NCIsInJlbGVhc2VfaWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDEiLCJyZXN1bHRfZGlnZXN0IjpudWxsfSwic2NoZW1hX3ZlcnNpb24iOjJ9Cg==";

const ACTION_CONTEXT_DIGEST: &str =
    "sha256:fc4ed54e6f5120fc10ba25faf79965c03e3299f60d75e643972d33440c3c8829";
const PREPARATION_CONTEXT_DIGEST: &str =
    "sha256:d950eb49e6133371368e74c202d380570442a095849410edb3c58f2b8f11eb1e";
const OBSERVATION_COMMITMENT: &str =
    "sha256:03747186479a16e66c32ade220d0f258838f2a319e43fe9a1fd249237605e57b";
const PREPARATION_13_COMMITMENT: &str =
    "sha256:f815a318ec6016d4c16bd22512e0c5687955bb6eadae19d09b926c286120e285";
const PREPARATION_30_COMMITMENT: &str =
    "sha256:87a359e060058e31fd52df1acb749c5160ddeb44c05a62eaa8227b22bc98ee6d";
const RELEASE_COMMITMENT: &str =
    "sha256:f4e1eb2026012a2fc481537948380bc680b014e27f10d3928e85daa64b4ac385";
const COMPLETED_COMMITMENT: &str =
    "sha256:5669ff5a5dbfb59c5c7226de6ff408bda3cc2fb3a7c0e313102ab3dd2f72f068";
const UNKNOWN_COMMITMENT: &str =
    "sha256:254039b132d8c557f557396ad0143a099f303b0d0da4305b5fded5e4e074f19f";

fn base64(input: &str) -> Vec<u8> {
    fn digit(byte: u8) -> u8 {
        match byte {
            b'A'..=b'Z' => byte - b'A',
            b'a'..=b'z' => byte - b'a' + 26,
            b'0'..=b'9' => byte - b'0' + 52,
            b'+' => 62,
            b'/' => 63,
            _ => panic!("fixed base64"),
        }
    }

    let mut output = Vec::with_capacity(input.len() / 4 * 3);
    for chunk in input.as_bytes().chunks_exact(4) {
        let a = digit(chunk[0]);
        let b = digit(chunk[1]);
        output.push((a << 2) | (b >> 4));
        if chunk[2] != b'=' {
            let c = digit(chunk[2]);
            output.push((b << 4) | (c >> 2));
            if chunk[3] != b'=' {
                output.push((c << 6) | digit(chunk[3]));
            }
        }
    }
    output
}

fn action_observation() -> Vec<u8> {
    base64(ACTION_OBSERVATION)
}

fn preparation_13() -> Vec<u8> {
    base64(PREPARATION_13)
}

fn preparation_30() -> Vec<u8> {
    base64(PREPARATION_30)
}

fn action_release() -> Vec<u8> {
    base64(ACTION_RELEASE)
}

fn result_completed() -> Vec<u8> {
    base64(RESULT_COMPLETED)
}

fn result_unknown() -> Vec<u8> {
    base64(RESULT_UNKNOWN)
}

fn value(input: &[u8]) -> Value {
    serde_json::from_slice(&input[..input.len() - 1]).expect("fixed vector JSON")
}

fn frame(value: &Value) -> Vec<u8> {
    let mut output = serde_json::to_vec(value).expect("test JSON");
    output.push(b'\n');
    output
}

fn action_observation_error(input: &[u8]) -> &'static str {
    match decode_action_observation(input) {
        Ok(_) => panic!("expected action observation denial"),
        Err(error) => error.code(),
    }
}

fn preparation_observation_error(input: &[u8]) -> &'static str {
    match decode_preparation_observation(input) {
        Ok(_) => panic!("expected preparation observation denial"),
        Err(error) => error.code(),
    }
}

fn action_release_error(input: &[u8]) -> &'static str {
    match decode_action_release(input) {
        Ok(_) => panic!("expected action release denial"),
        Err(error) => error.code(),
    }
}

fn action_result_error(input: &[u8]) -> &'static str {
    match decode_action_result(input) {
        Ok(_) => panic!("expected action result denial"),
        Err(error) => error.code(),
    }
}

fn object_paths(value: &Value, path: &mut Vec<String>, found: &mut Vec<Vec<String>>) {
    match value {
        Value::Object(object) => {
            found.push(path.clone());
            for (key, child) in object {
                path.push(key.clone());
                object_paths(child, path, found);
                path.pop();
            }
        }
        Value::Array(array) => {
            for (index, child) in array.iter().enumerate() {
                path.push(index.to_string());
                object_paths(child, path, found);
                path.pop();
            }
        }
        _ => {}
    }
}

fn object_mut<'a>(value: &'a mut Value, path: &[String]) -> &'a mut Map<String, Value> {
    let mut current = value;
    for component in path {
        current = if let Ok(index) = component.parse::<usize>() {
            &mut current.as_array_mut().expect("array path")[index]
        } else {
            current
                .as_object_mut()
                .expect("object path")
                .get_mut(component)
                .expect("fixed path")
        };
    }
    current.as_object_mut().expect("object path")
}

fn path(pointer: &str) -> Vec<&str> {
    pointer
        .strip_prefix('/')
        .expect("absolute test pointer")
        .split('/')
        .collect()
}

fn set(value: &mut Value, path: &[&str], replacement: Value) {
    let (last, parents) = path.split_last().expect("nonempty path");
    let mut current = value;
    for component in parents {
        current = match current {
            Value::Object(object) => object.get_mut(*component).expect("fixed object parent"),
            Value::Array(array) => &mut array[component.parse::<usize>().expect("array index")],
            _ => panic!("container parent"),
        };
    }
    match current {
        Value::Object(object) => {
            object.insert((*last).to_owned(), replacement);
        }
        Value::Array(array) => {
            array[last.parse::<usize>().expect("array leaf")] = replacement;
        }
        _ => panic!("container leaf"),
    }
}

fn error_at(decode: fn(&[u8]) -> &'static str, value: &Value) -> &'static str {
    decode(&frame(value))
}

fn assert_closed_maps(input: &[u8], decode: fn(&[u8]) -> &'static str) {
    let original = value(input);
    let mut paths = Vec::new();
    object_paths(&original, &mut Vec::new(), &mut paths);
    for path in paths {
        let keys = object_mut(&mut original.clone(), &path)
            .keys()
            .cloned()
            .collect::<Vec<_>>();
        for key in keys {
            let mut missing = original.clone();
            object_mut(&mut missing, &path).remove(&key);
            assert_eq!(error_at(decode, &missing), "headless_message.json_shape");

            let mut unknown = original.clone();
            object_mut(&mut unknown, &path).insert("unexpected".to_owned(), Value::Null);
            assert_eq!(error_at(decode, &unknown), "headless_message.json_shape");

            let current = object_mut(&mut original.clone(), &path)
                .get(&key)
                .expect("fixed member")
                .clone();
            let wrong_type = match current {
                Value::String(_) | Value::Array(_) | Value::Object(_) | Value::Null => {
                    Value::Bool(true)
                }
                Value::Number(_) | Value::Bool(_) => Value::String("wrong-type".to_owned()),
            };
            let mut wrong = original.clone();
            object_mut(&mut wrong, &path).insert(key.clone(), wrong_type);
            assert_eq!(error_at(decode, &wrong), "headless_message.json_shape");

            if !matches!(key.as_str(), "target" | "result_digest" | "link_target") {
                let mut null = original.clone();
                object_mut(&mut null, &path).insert(key.clone(), Value::Null);
                assert_eq!(error_at(decode, &null), "headless_message.json_shape");
            }
        }
    }
}

fn assert_object_arrays_deny(input: &[u8], decode: fn(&[u8]) -> &'static str) {
    let original = value(input);
    let mut paths = Vec::new();
    object_paths(&original, &mut Vec::new(), &mut paths);
    for path in paths {
        let mut changed = original.clone();
        let mut cursor = &mut changed;
        for component in &path {
            cursor = if let Ok(index) = component.parse::<usize>() {
                &mut cursor.as_array_mut().expect("array path")[index]
            } else {
                cursor
                    .as_object_mut()
                    .expect("object path")
                    .get_mut(component)
                    .expect("fixed path")
            };
        }
        let ordered_values = cursor
            .as_object()
            .expect("object replacement")
            .values()
            .cloned()
            .collect::<Vec<_>>();
        *cursor = Value::Array(ordered_values);
        assert_eq!(error_at(decode, &changed), "headless_message.json_shape");
    }
}

fn total_member_input(final_members: usize) -> Vec<u8> {
    let inner = |count| {
        (0..count)
            .map(|index| format!("\"i{index}\":null"))
            .collect::<Vec<_>>()
            .join(",")
    };
    let mut root = (0..62)
        .map(|index| format!("\"r{index}\":{{{}}}", inner(64)))
        .collect::<Vec<_>>();
    root.push(format!("\"r62\":{{{}}}", inner(63)));
    root.push(format!("\"r63\":{{{}}}", inner(final_members)));
    format!("{{{}}}\n", root.join(",")).into_bytes()
}

fn text_at<'a>(value: &'a Value, pointer: &str) -> &'a str {
    value
        .pointer(pointer)
        .and_then(Value::as_str)
        .expect("fixed text path")
}

fn sha256_text(bytes: &[u8]) -> String {
    let hash = Sha256::digest(bytes);
    let mut text = String::from("sha256:");
    for byte in hash {
        write!(&mut text, "{byte:02x}").expect("write to string");
    }
    text
}

fn v1_tool_digest_for_v2_fixture(value: &Value) -> String {
    let prefix = "/payload/execution_request";
    let arguments = format!("{prefix}/action/arguments");
    let identity = format!("{prefix}/target/identity");
    let metadata = format!("{arguments}/commit_metadata");
    let paths = value
        .pointer(&format!("{arguments}/allowed_paths"))
        .and_then(Value::as_array)
        .expect("fixed allowed paths")
        .iter()
        .map(|entry| entry.as_str().expect("fixed allowed path"))
        .collect::<Vec<_>>()
        .join("\0");
    let fields = [
        text_at(value, &format!("{identity}/repository_path")),
        text_at(value, &format!("{identity}/git_dir_path")),
        text_at(value, &format!("{identity}/object_format")),
        text_at(value, &format!("{identity}/head_ref")),
        text_at(value, &format!("{identity}/base_commit_oid")),
        text_at(value, &format!("{identity}/fixture_marker_sha256")),
        text_at(value, &format!("{arguments}/expected_tree_oid")),
        &paths,
        text_at(value, &format!("{arguments}/patch_sha256")),
        text_at(value, &format!("{metadata}/message")),
        text_at(value, &format!("{metadata}/author_name")),
        text_at(value, &format!("{metadata}/author_email")),
        text_at(value, &format!("{metadata}/author_time")),
        text_at(value, &format!("{metadata}/committer_name")),
        text_at(value, &format!("{metadata}/committer_email")),
        text_at(value, &format!("{metadata}/committer_time")),
    ];
    let mut encoded = b"lnsat.git-reference-adapter.tool-arguments.v1\0".to_vec();
    for field in fields {
        encoded.extend_from_slice(
            &u32::try_from(field.len())
                .expect("bounded field")
                .to_be_bytes(),
        );
        encoded.extend_from_slice(field.as_bytes());
    }
    sha256_text(&encoded)
}

fn pointer_join(parent: &str, component: &str) -> String {
    format!(
        "{parent}/{}",
        component.replace('~', "~0").replace('/', "~1")
    )
}

fn render_duplicate(
    value: &Value,
    path: &str,
    duplicate_path: &str,
    duplicate_key: &str,
    escaped: bool,
    output: &mut String,
) {
    match value {
        Value::Object(object) => {
            output.push('{');
            for (index, (key, child)) in object.iter().enumerate() {
                if index != 0 {
                    output.push(',');
                }
                output.push_str(&serde_json::to_string(key).expect("fixed key"));
                output.push(':');
                render_duplicate(
                    child,
                    &pointer_join(path, key),
                    duplicate_path,
                    duplicate_key,
                    escaped,
                    output,
                );
            }
            if path == duplicate_path {
                if !object.is_empty() {
                    output.push(',');
                }
                if escaped {
                    let first = duplicate_key
                        .as_bytes()
                        .first()
                        .copied()
                        .expect("nonempty fixed key");
                    output.push('"');
                    write!(output, "\\u{first:04x}").expect("write escaped key");
                    output.push_str(&duplicate_key[1..]);
                    output.push('"');
                } else {
                    output.push_str(&serde_json::to_string(duplicate_key).expect("fixed key"));
                }
                output.push_str(":null");
            }
            output.push('}');
        }
        Value::Array(array) => {
            output.push('[');
            for (index, child) in array.iter().enumerate() {
                if index != 0 {
                    output.push(',');
                }
                render_duplicate(
                    child,
                    &format!("{path}/{index}"),
                    duplicate_path,
                    duplicate_key,
                    escaped,
                    output,
                );
            }
            output.push(']');
        }
        primitive => output.push_str(&serde_json::to_string(primitive).expect("fixed value")),
    }
}

fn frame_with_duplicate(input: &[u8], duplicate_path: &str, escaped: bool) -> Vec<u8> {
    let root = value(input);
    let key = root
        .pointer(duplicate_path)
        .and_then(Value::as_object)
        .and_then(|object| object.keys().next())
        .expect("fixed object")
        .to_owned();
    let mut rendered = String::new();
    render_duplicate(&root, "", duplicate_path, &key, escaped, &mut rendered);
    rendered.push('\n');
    rendered.into_bytes()
}

fn object_pointer_paths(value: &Value, path: &str, found: &mut Vec<String>) {
    match value {
        Value::Object(object) => {
            found.push(path.to_owned());
            for (key, child) in object {
                object_pointer_paths(child, &pointer_join(path, key), found);
            }
        }
        Value::Array(array) => {
            for (index, child) in array.iter().enumerate() {
                object_pointer_paths(child, &format!("{path}/{index}"), found);
            }
        }
        _ => {}
    }
}

fn domain_digest(domain: &str, value: &Value) -> String {
    assert!(
        value.is_array(),
        "commitment input is the exact ordered array"
    );
    let mut bytes = domain.as_bytes().to_vec();
    bytes.push(b'\n');
    bytes.extend_from_slice(&serde_json::to_vec(value).expect("fixed canonical JSON"));
    sha256_text(&bytes)
}

fn action_startup_digest(value: &Value) -> String {
    let context = "/context";
    domain_digest(
        "lnsat.hcfg_startup_context.v2",
        &json!([
            "lnsat.adapter_process.docker_local.v2",
            "lnsat.contracts.v1_0",
            2,
            [
                text_at(value, &format!("{context}/installation_id")),
                value
                    .pointer(&format!("{context}/generation"))
                    .expect("generation"),
                value
                    .pointer(&format!("{context}/authority_epoch"))
                    .expect("epoch"),
                text_at(value, &format!("{context}/operation_id")),
                text_at(value, &format!("{context}/authorization_id")),
                value
                    .pointer(&format!("{context}/attempt_sequence"))
                    .expect("sequence"),
                text_at(value, &format!("{context}/candidate_digest")),
                text_at(value, &format!("{context}/profile_digest")),
                text_at(value, &format!("{context}/recipe_digest")),
                text_at(value, &format!("{context}/container_id")),
                text_at(value, &format!("{context}/channel_id")),
                text_at(value, &format!("{context}/challenge")),
            ],
        ]),
    )
}

fn preparation_startup_digest(value: &Value) -> String {
    let context = "/context";
    domain_digest(
        "lnsat.hcfg_probe_context.v1",
        &json!([
            "lnsat.preparation_probe.docker_local.v1",
            "lnsat.contracts.v1_0",
            1,
            [
                text_at(value, &format!("{context}/preparation_id")),
                text_at(value, &format!("{context}/candidate_digest")),
                text_at(value, &format!("{context}/profile_digest")),
                text_at(value, &format!("{context}/recipe_digest")),
                text_at(value, &format!("{context}/container_id")),
                text_at(value, &format!("{context}/channel_id")),
                text_at(value, &format!("{context}/challenge")),
            ],
        ]),
    )
}

fn rebind_action_observation(value: &mut Value) {
    let startup = action_startup_digest(value);
    set(value, &["payload", "startup_digest"], json!(startup));
    let observation = domain_digest(
        "lnsat.hcfg_startup_observation.v2",
        &json!([
            text_at(value, "/payload/startup_digest"),
            value.pointer("/payload/native").expect("native"),
        ]),
    );
    set(
        value,
        &["payload", "observation_digest"],
        json!(observation),
    );
}

fn duplicate_root(input: &[u8], escaped: bool) -> Vec<u8> {
    let key: &[u8] = if escaped {
        br#""\u0063ontext":null,"#
    } else {
        br#""context":null,"#
    };
    [&input[..1], key, &input[1..]].concat()
}

fn replace_once(input: &[u8], needle: &[u8], replacement: &[u8]) -> Vec<u8> {
    let position = input
        .windows(needle.len())
        .position(|window| window == needle)
        .expect("fixed fixture substring");
    [
        &input[..position],
        replacement,
        &input[position + needle.len()..],
    ]
    .concat()
}

#[test]
fn headless_startup_messages_reproduce_independent_fixed_vectors() {
    let action = action_observation();
    let decoded = decode_action_observation(&action).expect("action observation vector");
    assert_eq!(action.len(), 3_258);
    assert_eq!(decoded.canonical_frame.as_slice(), action);
    assert_eq!(
        digest_text(&decoded.context_digest).as_str(),
        ACTION_CONTEXT_DIGEST
    );
    assert_eq!(
        digest_text(&decoded.message_commitment).as_str(),
        OBSERVATION_COMMITMENT
    );

    for (input, commitment) in [
        (preparation_13(), PREPARATION_13_COMMITMENT),
        (preparation_30(), PREPARATION_30_COMMITMENT),
    ] {
        let decoded = decode_preparation_observation(&input).expect("preparation vector");
        assert_eq!(input.len(), 3_106);
        assert_eq!(decoded.canonical_frame.as_slice(), input);
        assert_eq!(
            digest_text(&decoded.context_digest).as_str(),
            PREPARATION_CONTEXT_DIGEST
        );
        assert_eq!(
            digest_text(&decoded.message_commitment).as_str(),
            commitment
        );
    }

    let release = action_release();
    let decoded = decode_action_release(&release).expect("release vector");
    assert_eq!(release.len(), 4_204);
    assert_eq!(decoded.canonical_frame.as_slice(), release);
    assert_eq!(
        digest_text(&decoded.context_digest).as_str(),
        ACTION_CONTEXT_DIGEST
    );
    assert_eq!(
        digest_text(&decoded.message_commitment).as_str(),
        RELEASE_COMMITMENT
    );

    for (input, commitment) in [
        (result_completed(), COMPLETED_COMMITMENT),
        (result_unknown(), UNKNOWN_COMMITMENT),
    ] {
        let decoded = decode_action_result(&input).expect("result vector");
        assert_eq!(decoded.canonical_frame.as_slice(), input);
        assert_eq!(
            digest_text(&decoded.context_digest).as_str(),
            ACTION_CONTEXT_DIGEST
        );
        assert_eq!(
            digest_text(&decoded.message_commitment).as_str(),
            commitment
        );
    }
}

#[test]
fn headless_startup_messages_close_each_nested_map() {
    assert_closed_maps(&action_observation(), action_observation_error);
    assert_closed_maps(&preparation_13(), preparation_observation_error);
    assert_closed_maps(&action_release(), action_release_error);
    assert_closed_maps(&result_completed(), action_result_error);

    assert_object_arrays_deny(&action_observation(), action_observation_error);
    assert_object_arrays_deny(&preparation_13(), preparation_observation_error);
    assert_object_arrays_deny(&action_release(), action_release_error);
    assert_object_arrays_deny(&result_completed(), action_result_error);

    for (input, decode) in [
        (
            action_observation(),
            action_observation_error as fn(&[u8]) -> &'static str,
        ),
        (
            preparation_13(),
            preparation_observation_error as fn(&[u8]) -> &'static str,
        ),
        (
            preparation_30(),
            preparation_observation_error as fn(&[u8]) -> &'static str,
        ),
        (
            action_release(),
            action_release_error as fn(&[u8]) -> &'static str,
        ),
        (
            result_completed(),
            action_result_error as fn(&[u8]) -> &'static str,
        ),
    ] {
        for escaped in [false, true] {
            assert_eq!(
                decode(&duplicate_root(&input, escaped)),
                "headless_message.json_shape"
            );
        }
    }
}

#[test]
fn headless_startup_messages_reject_raw_duplicates_at_every_object_position() {
    for (input, decode) in [
        (
            action_observation(),
            action_observation_error as fn(&[u8]) -> &'static str,
        ),
        (
            preparation_13(),
            preparation_observation_error as fn(&[u8]) -> &'static str,
        ),
        (
            action_release(),
            action_release_error as fn(&[u8]) -> &'static str,
        ),
        (
            result_completed(),
            action_result_error as fn(&[u8]) -> &'static str,
        ),
    ] {
        let mut paths = Vec::new();
        object_pointer_paths(&value(&input), "", &mut paths);
        for path in paths {
            for escaped in [false, true] {
                assert_eq!(
                    decode(&frame_with_duplicate(&input, &path, escaped)),
                    "headless_message.json_shape",
                    "duplicate at {path}, escaped={escaped}"
                );
            }
        }
    }
}

#[test]
fn headless_startup_messages_frame_preflight_and_error_order_are_fixed() {
    let decoders: [fn(&[u8]) -> &'static str; 4] = [
        action_observation_error,
        preparation_observation_error,
        action_release_error,
        action_result_error,
    ];
    for decode in decoders {
        assert_eq!(decode(b""), "headless_message.framing");
        assert_eq!(decode(b"{}\r\n"), "headless_message.framing");
        assert_eq!(decode(b"{}\n\n"), "headless_message.framing");
        assert_eq!(decode(b"{\xff}\n"), "headless_message.json_syntax");
        assert_eq!(
            decode(b"{\"x\":\"\\uD800\"}\n"),
            "headless_message.json_syntax"
        );
        assert_eq!(decode(b"{\"x\":01}\n"), "headless_message.json_syntax");
    }
    for (input, decode) in [
        (
            action_observation(),
            action_observation_error as fn(&[u8]) -> &'static str,
        ),
        (
            preparation_13(),
            preparation_observation_error as fn(&[u8]) -> &'static str,
        ),
        (
            action_release(),
            action_release_error as fn(&[u8]) -> &'static str,
        ),
        (
            result_completed(),
            action_result_error as fn(&[u8]) -> &'static str,
        ),
    ] {
        for length in 0..input.len() {
            assert_eq!(decode(&input[..length]), "headless_message.framing");
        }
    }
    assert_eq!(
        action_observation_error(&vec![b'x'; 65_537]),
        "headless_message.input_too_large"
    );
    assert_eq!(
        action_result_error(&vec![b'x'; 65_537]),
        "headless_message.input_too_large"
    );
    assert_eq!(
        action_release_error(&vec![b'x'; 8_388_609]),
        "headless_message.input_too_large"
    );
}

#[test]
fn headless_startup_messages_preflight_caps_and_lexical_order_are_fixed() {
    for input in [
        format!("{}\n", "[".repeat(33) + &"]".repeat(33)).into_bytes(),
        format!("{{\"{}\":null}}\n", "k".repeat(257)).into_bytes(),
        format!("{{\"k\":\"{}\"}}\n", "v".repeat(4_097)).into_bytes(),
        format!(
            "{{{}}}\n",
            (0..65)
                .map(|index| format!("\"k{index}\":null"))
                .collect::<Vec<_>>()
                .join(",")
        )
        .into_bytes(),
        format!("{{\"a\":[{}]}}\n", vec!["null"; 129].join(",")).into_bytes(),
    ] {
        assert_eq!(
            action_observation_error(&input),
            "headless_message.json_limits"
        );
    }

    for input in [
        format!("{{\"{}\":null}}\n", "k".repeat(256)).into_bytes(),
        format!("{{\"k\":\"{}\"}}\n", "v".repeat(4_096)).into_bytes(),
        format!("{{\"a\":[{}]}}\n", vec!["null"; 128].join(",")).into_bytes(),
        format!(
            "{{{}}}\n",
            (0..64)
                .map(|index| format!("\"k{index}\":null"))
                .collect::<Vec<_>>()
                .join(",")
        )
        .into_bytes(),
        format!("{}\n", "[".repeat(32) + &"]".repeat(32)).into_bytes(),
        total_member_input(1),
    ] {
        assert_eq!(
            action_observation_error(&input),
            "headless_message.json_shape"
        );
    }
    assert_eq!(
        action_observation_error(&total_member_input(2)),
        "headless_message.json_limits"
    );

    let duplicate_members = format!(
        "{{{}}}\n",
        (0..65)
            .map(|index| if index % 2 == 0 {
                "\"a\":null".to_owned()
            } else {
                "\"\\u0061\":null".to_owned()
            })
            .collect::<Vec<_>>()
            .join(",")
    );
    assert_eq!(
        action_observation_error(duplicate_members.as_bytes()),
        "headless_message.json_limits"
    );
    assert_eq!(
        action_observation_error(
            format!("{{\"{}\":\"unterminated}}\n", "k".repeat(257)).as_bytes()
        ),
        "headless_message.json_limits"
    );
}

#[test]
fn headless_startup_messages_reject_noncanonical_numeric_spellings_and_widths() {
    let action = action_observation();
    for replacement in ["1.0", "1e0", "-0"] {
        let raw = format!("\"attempt_sequence\":{replacement}");
        let changed = replace_once(&action, b"\"attempt_sequence\":1", raw.as_bytes());
        assert_eq!(
            action_observation_error(&changed),
            "headless_message.json_shape"
        );
    }
    let too_wide = replace_once(
        &action,
        b"\"schema_version\":2",
        b"\"schema_version\":4294967296",
    );
    assert_eq!(
        action_observation_error(&too_wide),
        "headless_message.json_shape"
    );
    let negative = replace_once(&action, b"\"generation\":1", b"\"generation\":-1");
    assert_eq!(
        action_observation_error(&negative),
        "headless_message.json_shape"
    );
}

#[test]
fn headless_startup_messages_hold_canonical_and_family_boundaries() {
    let action = action_observation();
    for length in 0..action.len() {
        assert_eq!(
            action_observation_error(&action[..length]),
            "headless_message.framing"
        );
    }
    let context_end = action
        .windows(b"},\"contract_id\"".len())
        .position(|window| window == b"},\"contract_id\"")
        .expect("fixed context boundary");
    let contract_start = context_end + 2;
    let contract_end = action[contract_start..]
        .windows(b",\"contract_version\"".len())
        .position(|window| window == b",\"contract_version\"")
        .map(|offset| contract_start + offset)
        .expect("fixed contract boundary");
    let swapped = [
        b"{".as_slice(),
        &action[contract_start..contract_end],
        b",".as_slice(),
        &action[1..=context_end],
        b",".as_slice(),
        &action[contract_end + 1..],
    ]
    .concat();
    assert_ne!(swapped, action);
    assert_eq!(
        action_observation_error(&swapped),
        "headless_message.canonical"
    );
    let escaped = replace_once(
        &action,
        b"startup_observation".as_slice(),
        b"startup_\\u006fbservation".as_slice(),
    );
    assert_eq!(
        action_observation_error(&escaped),
        "headless_message.canonical"
    );

    for (field, replacement) in [
        ("contract_id", json!("wrong")),
        ("contract_version", json!("wrong")),
        ("schema_version", json!(1)),
        ("message_type", json!("action_result")),
    ] {
        let mut changed = value(&action);
        set(&mut changed, &[field], replacement);
        assert_eq!(
            action_observation_error(&frame(&changed)),
            "headless_message.family"
        );
    }
}

#[test]
fn headless_startup_messages_reject_native_shape_and_probe_drift() {
    let action = action_observation();
    for (path, replacement, code) in [
        (
            path("/payload/native/process/pid"),
            json!(0),
            "headless_message.payload",
        ),
        (
            path("/payload/native/process/uids"),
            json!([1000, 1000, 1000]),
            "headless_message.json_shape",
        ),
        (
            path("/payload/native/process/groups"),
            json!([2, 1]),
            "headless_message.payload",
        ),
        (
            path("/payload/native/process/environment"),
            json!(["A=x", "A=y"]),
            "headless_message.payload",
        ),
        (
            path("/payload/native/mounts/0/mount_point"),
            json!("work"),
            "headless_message.payload",
        ),
        (
            path("/payload/native/target"),
            Value::Null,
            "headless_message.payload",
        ),
    ] {
        let mut changed = value(&action);
        set(&mut changed, &path, replacement);
        assert_eq!(action_observation_error(&frame(&changed)), code);
    }

    for input in [preparation_13(), preparation_30()] {
        let mut target = value(&input);
        set(&mut target, &["payload", "native", "target"], json!({}));
        assert_eq!(
            preparation_observation_error(&frame(&target)),
            "headless_message.json_shape"
        );
        let mut checks = value(&input);
        set(
            &mut checks,
            &["payload", "negative_checks", "3", "errno"],
            json!(2),
        );
        assert_eq!(
            preparation_observation_error(&frame(&checks)),
            "headless_message.payload"
        );
    }
}

#[test]
fn headless_startup_messages_keep_native_width_and_boot_uuid_grammar_separate() {
    let action = action_observation();
    let mut boot = value(&action);
    set(
        &mut boot,
        &["payload", "native", "kernel", "boot_id"],
        json!("00000000-0000-1000-8000-000000000000"),
    );
    assert_eq!(
        action_observation_error(&frame(&boot)),
        "headless_message.binding"
    );
    for path in [
        path("/payload/native/mapping/uid_map/0/0"),
        path("/payload/native/mapping/gid_map/0/1"),
    ] {
        let mut changed = value(&action);
        set(&mut changed, &path, json!(4_294_967_296_u64));
        assert_eq!(
            action_observation_error(&frame(&changed)),
            "headless_message.json_shape"
        );
    }
}

#[test]
fn headless_startup_messages_reject_native_order_count_path_environment_and_device_cases() {
    let action = action_observation();
    for (path, replacement) in [
        (path("/payload/native/process/groups"), json!([1000, 1000])),
        (
            path("/payload/native/process/inherited_fds"),
            json!([0, 1, 1]),
        ),
        (
            path("/payload/native/cgroup/controllers"),
            json!(["pids", "memory", "cpu"]),
        ),
        (
            path("/payload/native/process/environment"),
            json!(vec!["A=x"; 17]),
        ),
        (
            path("/payload/native/mounts/0/mount_point"),
            json!("/work/../escape"),
        ),
        (
            path("/payload/native/mounts/0/mount_source"),
            json!("bad\u{0000}source"),
        ),
        (
            path("/payload/native/process/cap_effective"),
            json!("000000000000000G"),
        ),
    ] {
        let mut changed = value(&action);
        set(&mut changed, &path, replacement);
        assert_eq!(
            action_observation_error(&frame(&changed)),
            "headless_message.payload"
        );
    }

    let mut device = value(&action);
    device
        .pointer_mut("/payload/native/devices")
        .and_then(Value::as_array_mut)
        .expect("device array")
        .push(json!({
            "gid": 1000, "link_target": null, "major": 1, "minor": 3,
            "mode": 0, "path": "/dev/null", "type": "symlink", "uid": 1000
        }));
    assert_eq!(
        action_observation_error(&frame(&device)),
        "headless_message.payload"
    );

    let mut map = value(&action);
    set(
        &mut map,
        &["payload", "native", "mapping", "uid_map", "0"],
        json!([0, 0]),
    );
    assert_eq!(
        action_observation_error(&frame(&map)),
        "headless_message.json_shape"
    );

    let mut at_limit = value(&action);
    set(
        &mut at_limit,
        &["payload", "native", "target", "descriptor_access"],
        json!("x".repeat(32)),
    );
    rebind_action_observation(&mut at_limit);
    assert!(
        decode_action_observation(&frame(&at_limit)).is_ok(),
        "32-byte descriptor access stays a representation positive"
    );
    set(
        &mut at_limit,
        &["payload", "native", "target", "descriptor_access"],
        json!("x".repeat(33)),
    );
    assert_eq!(
        action_observation_error(&frame(&at_limit)),
        "headless_message.payload"
    );
    for path in [
        path("/payload/native/process/environment"),
        path("/payload/native/security/apparmor_label"),
        path("/payload/native/mounts/0/mount_source"),
        path("/payload/native/mounts/0/mount_point"),
    ] {
        let mut control = value(&action);
        let replacement = if path.last() == Some(&"environment") {
            json!(["A=ok\u{001f}"])
        } else if path.last() == Some(&"mount_point") {
            json!("/work\u{001f}")
        } else {
            json!("bad\u{001f}")
        };
        set(&mut control, &path, replacement);
        assert_eq!(
            action_observation_error(&frame(&control)),
            "headless_message.payload"
        );
    }
}

#[test]
fn headless_startup_messages_apply_release_patch_exception_only_at_exact_path() {
    let release = action_release();

    let mut ordinary = value(&release);
    set(
        &mut ordinary,
        &["payload", "execution_request", "project_ref"],
        json!("x".repeat(4_097)),
    );
    assert_eq!(
        action_release_error(&frame(&ordinary)),
        "headless_message.json_limits"
    );

    let mut patch = value(&release);
    set(
        &mut patch,
        &[
            "payload",
            "execution_request",
            "action",
            "arguments",
            "patch",
        ],
        json!("x".repeat(1_048_576)),
    );
    let patch_digest = sha256_text(
        text_at(&patch, "/payload/execution_request/action/arguments/patch").as_bytes(),
    );
    set(
        &mut patch,
        &[
            "payload",
            "execution_request",
            "action",
            "arguments",
            "patch_sha256",
        ],
        json!(patch_digest),
    );
    let tool_digest = v1_tool_digest_for_v2_fixture(&patch);
    set(
        &mut patch,
        &["payload", "tool_arguments_digest"],
        json!(tool_digest),
    );
    let full_patch = frame(&patch);
    let decoded = decode_action_release(&full_patch).expect("one-mebibyte exact patch");
    assert_eq!(decoded.canonical_frame.as_slice(), full_patch);
    set(
        &mut patch,
        &[
            "payload",
            "execution_request",
            "action",
            "arguments",
            "patch",
        ],
        json!("x".repeat(1_048_577)),
    );
    assert_eq!(
        action_release_error(&frame(&patch)),
        "headless_message.json_limits"
    );

    for path in [
        path("/payload/execution_request/action/arguments/Patch"),
        path("/payload/execution_request/action/arguments/extra"),
    ] {
        let mut wrong_path = value(&release);
        let replacement = if path.last() == Some(&"Patch") {
            json!("x".repeat(4_097))
        } else {
            json!({ "patch": "x".repeat(4_097) })
        };
        set(&mut wrong_path, &path, replacement);
        assert_eq!(
            action_release_error(&frame(&wrong_path)),
            "headless_message.json_limits"
        );
    }

    let mut array_path = value(&release);
    set(
        &mut array_path,
        &[
            "payload",
            "execution_request",
            "action",
            "arguments",
            "patch",
        ],
        json!(["x".repeat(4_097)]),
    );
    assert_eq!(
        action_release_error(&frame(&array_path)),
        "headless_message.json_limits"
    );
}

#[test]
fn headless_startup_messages_reject_each_private_git_predicate_and_legacy_shape() {
    let release = action_release();
    for (path, replacement) in [
        (
            path("/payload/execution_request/action/arguments/schema_id"),
            json!("wrong"),
        ),
        (
            path("/payload/execution_request/action/arguments/base_commit_oid"),
            json!("A".repeat(40)),
        ),
        (
            path("/payload/execution_request/action/arguments/head_ref"),
            json!("refs/heads/a..b"),
        ),
        (
            path("/payload/execution_request/action/arguments/allowed_paths"),
            json!([".lnsat-disposable-git-fixture-v1"]),
        ),
        (
            path("/payload/execution_request/action/arguments/commit_metadata/message"),
            json!("no terminal newline"),
        ),
        (
            path("/payload/execution_request/action/arguments/commit_metadata/author_email"),
            json!("not-an-email"),
        ),
        (
            path("/payload/execution_request/action/arguments/commit_metadata/author_name"),
            json!("bad<name"),
        ),
        (
            path("/payload/execution_request/action/arguments/commit_metadata/author_time"),
            json!("- +0000"),
        ),
        (
            path("/payload/execution_request/action/arguments/commit_metadata/committer_name"),
            json!("bad\nname"),
        ),
        (
            path("/payload/execution_request/action/arguments/commit_metadata/committer_email"),
            json!("not-an-email"),
        ),
        (
            path("/payload/execution_request/action/arguments/commit_metadata/committer_time"),
            json!("0 +0100"),
        ),
        (
            path("/payload/execution_request/target/identity/repository_path"),
            json!("/"),
        ),
        (
            path("/payload/execution_request/target/identity/object_format"),
            json!("sha256"),
        ),
    ] {
        let mut changed = value(&release);
        set(&mut changed, &path, replacement);
        assert_eq!(
            action_release_error(&frame(&changed)),
            "headless_message.payload"
        );
    }

    let mut legacy = value(&release);
    set(
        &mut legacy,
        &["payload", "execution_request", "adapter", "version"],
        json!("v1"),
    );
    set(
        &mut legacy,
        &["payload", "execution_request", "packet_ref", "packet_id"],
        json!("packet-legacy-hash-only-example"),
    );
    assert_eq!(
        action_release_error(&frame(&legacy)),
        "headless_message.payload"
    );
}

#[test]
fn headless_startup_messages_reject_release_and_result_drift() {
    let release = action_release();
    for (path, replacement, code) in [
        (
            path("/payload/execution_request/adapter/version"),
            json!("v1"),
            "headless_message.payload",
        ),
        (
            path("/payload/execution_request/action/arguments/allowed_paths"),
            json!(["z", "a"]),
            "headless_message.payload",
        ),
        (
            path("/payload/execution_request/action/arguments/patch"),
            json!("secret-canary"),
            "headless_message.binding",
        ),
        (
            path("/payload/repository_mount_path"),
            json!("/"),
            "headless_message.payload",
        ),
        (
            path("/payload/target_digest"),
            json!("sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
            "headless_message.binding",
        ),
        (
            path("/payload/tool_arguments_digest"),
            json!("sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
            "headless_message.binding",
        ),
    ] {
        let mut changed = value(&release);
        set(&mut changed, &path, replacement);
        assert_eq!(action_release_error(&frame(&changed)), code);
    }

    for path in [
        path("/payload/execution_request/target/identity/head_ref"),
        path("/payload/execution_request/target/identity/base_commit_oid"),
    ] {
        let mut changed = value(&release);
        let replacement = if path.last() == Some(&"head_ref") {
            json!("refs/heads/other")
        } else {
            json!("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
        };
        set(&mut changed, &path, replacement);
        assert_eq!(
            action_release_error(&frame(&changed)),
            "headless_message.payload"
        );
    }
    let mut payload_first = value(&release);
    set(
        &mut payload_first,
        &["payload", "repository_mount_path"],
        json!("/"),
    );
    set(
        &mut payload_first,
        &["payload", "startup_digest"],
        json!("sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
    );
    assert_eq!(
        action_release_error(&frame(&payload_first)),
        "headless_message.payload"
    );
}

#[test]
fn headless_startup_messages_result_nullable_outcome_is_exact() {
    let completed = result_completed();
    let mut null_completed = value(&completed);
    set(
        &mut null_completed,
        &["payload", "result_digest"],
        Value::Null,
    );
    assert_eq!(
        action_result_error(&frame(&null_completed)),
        "headless_message.payload"
    );
    let mut digest_unknown = value(&result_unknown());
    set(
        &mut digest_unknown,
        &["payload", "result_digest"],
        json!("sha256:7777777777777777777777777777777777777777777777777777777777777777"),
    );
    assert_eq!(
        action_result_error(&frame(&digest_unknown)),
        "headless_message.payload"
    );
    let mut unknown = value(&completed);
    set(&mut unknown, &["payload", "outcome"], json!("wrong"));
    assert_eq!(
        action_result_error(&frame(&unknown)),
        "headless_message.payload"
    );
}

#[test]
fn headless_startup_messages_accept_self_consistent_unverified_observation_replacements() {
    let action = action_observation();
    let original = decode_action_observation(&action).expect("published action");
    let mut changed = value(&action);
    assert_eq!(action_startup_digest(&changed), ACTION_CONTEXT_DIGEST);
    set(&mut changed, &["context", "generation"], json!(2));
    let startup = action_startup_digest(&changed);
    set(&mut changed, &["payload", "startup_digest"], json!(startup));
    let observation = domain_digest(
        "lnsat.hcfg_startup_observation.v2",
        &json!([
            text_at(&changed, "/payload/startup_digest"),
            changed.pointer("/payload/native").expect("native"),
        ]),
    );
    set(
        &mut changed,
        &["payload", "observation_digest"],
        json!(observation),
    );
    let replacement = decode_action_observation(&frame(&changed)).expect("unverified replacement");
    assert_ne!(replacement.context_digest, original.context_digest);
    assert_ne!(replacement.message_commitment, original.message_commitment);

    let preparation = preparation_13();
    let original = decode_preparation_observation(&preparation).expect("published preparation");
    let mut changed = value(&preparation);
    assert_eq!(
        preparation_startup_digest(&changed),
        PREPARATION_CONTEXT_DIGEST
    );
    set(
        &mut changed,
        &["context", "challenge"],
        json!("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
    );
    let startup = preparation_startup_digest(&changed);
    set(&mut changed, &["payload", "startup_digest"], json!(startup));
    let observation = domain_digest(
        "lnsat.hcfg_probe_observation.v1",
        &json!([
            text_at(&changed, "/payload/startup_digest"),
            changed.pointer("/payload/native").expect("native"),
            changed.pointer("/payload/negative_checks").expect("checks"),
        ]),
    );
    set(
        &mut changed,
        &["payload", "observation_digest"],
        json!(observation),
    );
    let replacement =
        decode_preparation_observation(&frame(&changed)).expect("unverified replacement");
    assert_ne!(replacement.context_digest, original.context_digest);
    assert_ne!(replacement.message_commitment, original.message_commitment);
}

#[test]
fn headless_startup_messages_deny_context_and_binding_substitutions_without_echoing_input() {
    let action = action_observation();
    let mut context = value(&action);
    set(&mut context, &["context", "generation"], json!(2));
    assert_eq!(
        action_observation_error(&frame(&context)),
        "headless_message.binding"
    );
    let mut outer = value(&action);
    set(
        &mut outer,
        &["payload", "startup_digest"],
        json!("sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
    );
    assert_eq!(
        action_observation_error(&frame(&outer)),
        "headless_message.binding"
    );
    let mut result = value(&result_completed());
    set(
        &mut result,
        &["payload", "release_id"],
        json!("550e8400-e29b-41d4-a716-446655440099"),
    );
    let original = decode_action_result(&result_completed()).expect("published result");
    let replacement = decode_action_result(&frame(&result)).expect("self-consistent declaration");
    assert_ne!(replacement.message_commitment, original.message_commitment);

    let mut secret = value(&action);
    set(
        &mut secret,
        &["context", "operation_id"],
        json!("secret-canary"),
    );
    let error = action_observation_error(&frame(&secret));
    assert_eq!(error, "headless_message.context");
    assert!(!error.contains("secret-canary"));
}

fn device_fixture(kind: &str, link: Value) -> Value {
    let mut value = json!({"gid":1000,"major":0,"minor":0,"mode":0,
        "path":"/dev/example","type":kind,"uid":1000});
    value
        .as_object_mut()
        .unwrap()
        .insert("link_target".to_owned(), link);
    value
}

fn observation_with_device(device: Value) -> Vec<u8> {
    let mut input = value(&action_observation());
    set(
        &mut input,
        &path("/payload/native/devices"),
        Value::Array(vec![device]),
    );
    rebind_action_observation(&mut input);
    frame(&input)
}

#[test]
fn headless_startup_messages_device_link_presence_and_types_are_exact() {
    for device in [
        device_fixture("character", Value::Null),
        device_fixture("symlink", json!("/proc/self/fd")),
    ] {
        let input = observation_with_device(device.clone());
        decode_action_observation(&input).expect("synthetic device representation");
        assert_closed_maps(&input, action_observation_error);
        assert_object_arrays_deny(&input, action_observation_error);
        for escaped in [false, true] {
            assert_eq!(
                action_observation_error(&frame_with_duplicate(
                    &input,
                    "/payload/native/devices/0",
                    escaped
                )),
                "headless_message.json_shape"
            );
        }
        let mut absent = device;
        absent.as_object_mut().unwrap().remove("link_target");
        assert_eq!(
            action_observation_error(&observation_with_device(absent)),
            "headless_message.json_shape"
        );
    }
    for link in [
        "pts/0",
        "/proc/self/fd",
        "/proc/self/fd/0",
        "/proc/self/fd/1",
        "/proc/self/fd/2",
        "/proc/kcore",
    ] {
        decode_action_observation(&observation_with_device(device_fixture(
            "symlink",
            json!(link),
        )))
        .expect("allowed synthetic link representation");
    }
    for device in [
        device_fixture("character", json!("pts/0")),
        device_fixture("symlink", Value::Null),
        device_fixture("block", Value::Null),
        device_fixture("symlink", json!("/etc/passwd")),
        device_fixture("symlink", json!("../outside")),
        device_fixture("symlink", json!("")),
    ] {
        assert_eq!(
            action_observation_error(&observation_with_device(device)),
            "headless_message.payload"
        );
    }
    for field in ["major", "minor"] {
        let mut device = device_fixture("symlink", json!("pts/0"));
        device[field] = json!(1);
        assert_eq!(
            action_observation_error(&observation_with_device(device)),
            "headless_message.payload"
        );
    }
}

fn assert_native_boundary(pointer: &str, accepted: Value, rejected: Value, code: &str) {
    let mut input = value(&action_observation());
    set(&mut input, &path(pointer), accepted);
    rebind_action_observation(&mut input);
    decode_action_observation(&frame(&input))
        .unwrap_or_else(|error| panic!("{pointer}: {}", error.code()));
    set(&mut input, &path(pointer), rejected);
    assert_eq!(action_observation_error(&frame(&input)), code, "{pointer}");
}

#[test]
fn headless_startup_messages_native_collection_caps_are_inclusive() {
    for pointer in [
        "/payload/native/process/groups",
        "/payload/native/process/inherited_fds",
    ] {
        assert_native_boundary(
            pointer,
            json!((0..16).collect::<Vec<_>>()),
            json!((0..17).collect::<Vec<_>>()),
            "headless_message.payload",
        );
    }
    for pointer in [
        "/payload/native/mapping/uid_map",
        "/payload/native/mapping/gid_map",
    ] {
        assert_native_boundary(
            pointer,
            json!(vec![[0, 0, 0]; 8]),
            json!(vec![[0, 0, 0]; 9]),
            "headless_message.payload",
        );
    }
    let names = |n| (0..n).map(|i| format!("n{i:03}")).collect::<Vec<_>>();
    for pointer in [
        "/payload/native/cgroup/controllers",
        "/payload/native/security/network_interfaces",
    ] {
        assert_native_boundary(
            pointer,
            json!(names(16)),
            json!(names(17)),
            "headless_message.payload",
        );
    }
    for pointer in [
        "/payload/native/mounts/0/mount_options",
        "/payload/native/mounts/0/optional_fields",
        "/payload/native/mounts/0/super_options",
    ] {
        assert_native_boundary(
            pointer,
            json!(names(64)),
            json!(names(65)),
            "headless_message.payload",
        );
    }
    let mounts = |n| {
        (0..n)
            .map(|i| {
                let mut mount =
                    value(&action_observation())["payload"]["native"]["mounts"][0].clone();
                mount["mount_id"] = json!(i + 1);
                mount
            })
            .collect::<Vec<_>>()
    };
    assert_native_boundary(
        "/payload/native/mounts",
        json!(mounts(128)),
        json!(mounts(129)),
        "headless_message.json_limits",
    );
    let devices = |n| {
        (0..n)
            .map(|i| {
                let mut device = device_fixture("character", Value::Null);
                device["path"] = json!(format!("/dev/d{i:02}"));
                device
            })
            .collect::<Vec<_>>()
    };
    assert_native_boundary(
        "/payload/native/devices",
        json!(devices(32)),
        json!(devices(33)),
        "headless_message.payload",
    );
    assert_native_boundary(
        "/payload/native/process/environment",
        json!((0..16).map(|i| format!("E{i}=")).collect::<Vec<_>>()),
        json!((0..17).map(|i| format!("E{i}=")).collect::<Vec<_>>()),
        "headless_message.payload",
    );
}

#[test]
fn headless_startup_messages_native_string_caps_and_controls_are_exact() {
    for (pointer, max) in [
        ("/payload/native/target/descriptor_access", 32),
        ("/payload/native/mounts/0/filesystem_type", 32),
        ("/payload/native/security/apparmor_label", 256),
        ("/payload/native/mounts/0/mount_source", 4096),
    ] {
        assert_native_boundary(
            pointer,
            json!("a".repeat(max)),
            json!("a".repeat(max + 1)),
            if max == 4096 {
                "headless_message.json_limits"
            } else {
                "headless_message.payload"
            },
        );
    }
    for (pointer, max) in [
        ("/payload/native/target/mount_path", 256),
        ("/payload/native/mounts/0/root", 4096),
        ("/payload/native/mounts/0/mount_point", 4096),
        ("/payload/native/cgroup/membership_path", 4096),
    ] {
        assert_native_boundary(
            pointer,
            json!(format!("/{}", "a".repeat(max - 1))),
            json!(format!("/{}", "a".repeat(max))),
            if max == 4096 {
                "headless_message.json_limits"
            } else {
                "headless_message.payload"
            },
        );
    }
    for (pointer, max) in [
        ("/payload/native/cgroup/controllers", 32),
        ("/payload/native/security/network_interfaces", 32),
        ("/payload/native/mounts/0/mount_options", 256),
        ("/payload/native/mounts/0/optional_fields", 256),
        ("/payload/native/mounts/0/super_options", 256),
    ] {
        assert_native_boundary(
            pointer,
            json!(["a".repeat(max)]),
            json!(["a".repeat(max + 1)]),
            "headless_message.payload",
        );
    }
    for pointer in [
        "/payload/native/security/apparmor_label",
        "/payload/native/mounts/0/mount_source",
    ] {
        assert_native_boundary(
            pointer,
            json!("a"),
            json!("a\u{0085}"),
            "headless_message.payload",
        );
    }
    assert_native_boundary(
        "/payload/native/process/environment",
        json!(["A="]),
        json!(["A=\u{0085}"]),
        "headless_message.payload",
    );
    assert_native_boundary(
        "/payload/native/process/environment",
        json!([format!("A={}", "v".repeat(1024))]),
        json!([format!("A={}", "v".repeat(1025))]),
        "headless_message.payload",
    );
    assert_native_boundary(
        "/payload/native/process/environment",
        json!([format!("{}=", "A".repeat(64))]),
        json!([format!("{}=", "A".repeat(65))]),
        "headless_message.payload",
    );
    let environment = |last| {
        json!([
            format!("A={}", "x".repeat(1022)),
            format!("B={}", "x".repeat(1022)),
            format!("C={}", "x".repeat(1022)),
            format!("D={}", "x".repeat(last))
        ])
    };
    assert_native_boundary(
        "/payload/native/process/environment",
        environment(1022),
        environment(1023),
        "headless_message.payload",
    );
}

fn assert_release_denials(pointer: &str, cases: &[Value], code: &str) {
    for replacement in cases {
        let mut input = value(&action_release());
        set(
            &mut input,
            &path(&format!("/payload/execution_request/{pointer}")),
            replacement.clone(),
        );
        assert_eq!(
            action_release_error(&frame(&input)),
            code,
            "{pointer}: {replacement}"
        );
    }
}

#[test]
fn headless_startup_messages_every_release_selector_and_target_predicate_is_checked() {
    for (pointer, bad) in [
        ("action/kind", "git.status"),
        ("adapter/ref", "adapter:other:git-commit"),
        ("audience", "audience:gateway:other"),
        ("target/resource_ref", "resource:other"),
        ("target/identity/schema_id", "wrong"),
        ("target/identity/object_format", "sha256"),
        ("target/identity/fixture_marker_sha256", "sha256:invalid"),
    ] {
        assert_release_denials(pointer, &[json!(bad)], "headless_message.payload");
    }
    for pointer in [
        "action/arguments/base_commit_oid",
        "action/arguments/expected_tree_oid",
        "target/identity/base_commit_oid",
    ] {
        assert_release_denials(
            pointer,
            &[
                json!("a".repeat(39)),
                json!("a".repeat(41)),
                json!("A".repeat(40)),
                json!("g".repeat(40)),
            ],
            "headless_message.payload",
        );
    }
    for pointer in ["action/arguments/head_ref", "target/identity/head_ref"] {
        let cases = [
            "main",
            "refs/heads/a..b",
            "refs/heads/a.",
            "refs/heads/a/",
            "refs/heads/a b",
        ];
        assert_release_denials(
            pointer,
            &cases.into_iter().map(|v| json!(v)).collect::<Vec<_>>(),
            "headless_message.payload",
        );
        assert_release_denials(
            pointer,
            &[json!(format!("refs/heads/{}", "a".repeat(247)))],
            "headless_message.payload",
        );
    }
    for pointer in [
        "target/identity/repository_path",
        "target/identity/git_dir_path",
    ] {
        let cases = [
            "/",
            "relative",
            "/a//b",
            "/a/./b",
            "/a/../b",
            "/a/",
            "/a\\b",
            "/a\u{001f}b",
        ];
        assert_release_denials(
            pointer,
            &cases.into_iter().map(|v| json!(v)).collect::<Vec<_>>(),
            "headless_message.payload",
        );
    }
    assert_release_denials(
        "action/arguments/patch",
        &[json!("")],
        "headless_message.payload",
    );
    assert_release_denials(
        "action/arguments/patch_sha256",
        &[json!("invalid")],
        "headless_message.payload",
    );
}

#[test]
fn headless_startup_messages_every_git_path_and_metadata_predicate_is_checked() {
    for bad in [
        "",
        "/absolute",
        "a//b",
        "a/./b",
        "a/../b",
        "a/",
        "a\\b",
        "a\u{0000}b",
        "a\u{001f}b",
        ".lnsat-disposable-git-fixture-v1",
    ] {
        assert_release_denials(
            "action/arguments/allowed_paths",
            &[json!([bad])],
            "headless_message.payload",
        );
    }
    assert_release_denials(
        "action/arguments/allowed_paths",
        &[
            json!([]),
            json!(["a", "a"]),
            json!((0..65).map(|i| format!("p{i:02}")).collect::<Vec<_>>()),
            json!(["a".repeat(513)]),
        ],
        "headless_message.payload",
    );
    for field in [
        "author_name",
        "committer_name",
        "author_email",
        "committer_email",
    ] {
        let pointer = format!("action/arguments/commit_metadata/{field}");
        for bad in ["", "a\n@b", "a\r@b", "a\u{0000}@b", "a<@b", "a>@b"] {
            assert_release_denials(&pointer, &[json!(bad)], "headless_message.payload");
        }
        assert_release_denials(
            &pointer,
            &[json!(format!("{}@b", "a".repeat(255)))],
            "headless_message.payload",
        );
    }
    for field in ["author_time", "committer_time"] {
        let pointer = format!("action/arguments/commit_metadata/{field}");
        for bad in [
            " +0000",
            "-1 +0000",
            "1.0 +0000",
            "1 +0100",
            "1  +0000",
            "1 +0000 ",
            "1234567890123 +0000",
        ] {
            assert_release_denials(&pointer, &[json!(bad)], "headless_message.payload");
        }
    }
    assert_release_denials(
        "action/arguments/commit_metadata/message",
        &[json!(""), json!("no newline"), json!("nul\u{0000}\n")],
        "headless_message.payload",
    );
    assert_release_denials(
        "action/arguments/commit_metadata/message",
        &[json!(format!("{}\n", "a".repeat(4096)))],
        "headless_message.json_limits",
    );
}

fn rebind_release(input: &mut Value) {
    let target =
        serde_json::to_vec(input.pointer("/payload/execution_request/target").unwrap()).unwrap();
    let mut target_input = b"lnsat.execution-request.target.v1\0".to_vec();
    target_input.extend_from_slice(&u32::try_from(target.len()).unwrap().to_be_bytes());
    target_input.extend_from_slice(&target);
    let tool = v1_tool_digest_for_v2_fixture(input);
    set(
        input,
        &path("/payload/target_digest"),
        json!(sha256_text(&target_input)),
    );
    set(input, &path("/payload/tool_arguments_digest"), json!(tool));
}

#[test]
fn headless_startup_messages_git_metadata_and_reference_limits_have_valid_positives() {
    let original = value(&action_release());
    let mut unchanged = original.clone();
    rebind_release(&mut unchanged);
    assert_eq!(
        unchanged, original,
        "independent helper reproduces fixed target/tool vectors"
    );
    for field in [
        "requester_ref",
        "requester_session_ref",
        "approver_ref",
        "approver_session_ref",
        "project_ref",
        "resource_ref",
    ] {
        for at in [
            format!("abcdefghijklmnop:{}", "a".repeat(239)),
            format!("r:{}", "é".repeat(127)),
        ] {
            assert_eq!(at.len(), 256);
            let mut input = original.clone();
            set(
                &mut input,
                &path(&format!("/payload/execution_request/{field}")),
                json!(at),
            );
            if field == "resource_ref" {
                input["payload"]["execution_request"]["target"]["resource_ref"] = json!(at);
            }
            rebind_release(&mut input);
            decode_action_release(&frame(&input)).expect("valid 256-byte reference");
            set(
                &mut input,
                &path(&format!("/payload/execution_request/{field}")),
                json!(format!("{at}x")),
            );
            assert_eq!(
                action_release_error(&frame(&input)),
                "headless_message.payload"
            );
        }
    }
    for (field, good) in [
        ("author_name", "a".repeat(256)),
        ("committer_name", "a".repeat(256)),
        ("author_email", format!("{}@b", "a".repeat(254))),
        ("committer_email", format!("{}@b", "a".repeat(254))),
        ("author_time", "0 +0000".to_owned()),
        ("committer_time", "123456789012 +0000".to_owned()),
        ("message", format!("{}\n", "a".repeat(4095))),
    ] {
        let mut input = original.clone();
        set(
            &mut input,
            &path(&format!(
                "/payload/execution_request/action/arguments/commit_metadata/{field}"
            )),
            json!(good),
        );
        rebind_release(&mut input);
        decode_action_release(&frame(&input)).expect("valid metadata endpoint");
    }
    for paths in [
        vec!["a".repeat(512)],
        (0..64).map(|i| format!("p{i:02}")).collect::<Vec<_>>(),
    ] {
        let mut input = original.clone();
        input["payload"]["execution_request"]["action"]["arguments"]["allowed_paths"] =
            json!(paths);
        rebind_release(&mut input);
        decode_action_release(&frame(&input)).expect("valid allowed-path endpoint");
    }
}

#[test]
fn headless_startup_messages_object_depth_mapping_width_and_probe_set_are_exact() {
    for (depth, code) in [
        (32, "headless_message.json_shape"),
        (33, "headless_message.json_limits"),
    ] {
        let raw = format!("{}null{}\n", "{\"x\":".repeat(depth), "}".repeat(depth));
        assert_eq!(action_observation_error(raw.as_bytes()), code);
    }
    let mut input = value(&action_observation());
    set(
        &mut input,
        &path("/payload/native/mapping/uid_map/0/2"),
        json!(u64::MAX),
    );
    rebind_action_observation(&mut input);
    decode_action_observation(&frame(&input)).expect("u64 mapping width positive");
    set(
        &mut input,
        &path("/payload/native/mapping/uid_map/0/2"),
        json!("map-width-placeholder"),
    );
    let raw = replace_once(
        &frame(&input),
        b"\"map-width-placeholder\"",
        b"18446744073709551616",
    );
    assert_eq!(
        action_observation_error(&raw),
        "headless_message.json_shape"
    );
    let original = value(&preparation_13());
    let checks = original["payload"]["negative_checks"].as_array().unwrap();
    for mutation in [
        checks[..4].to_vec(),
        [checks.as_slice(), &checks[..1]].concat(),
        {
            let mut reordered = checks.clone();
            reordered.swap(0, 1);
            reordered
        },
    ] {
        let mut input = original.clone();
        input["payload"]["negative_checks"] = json!(mutation);
        assert_eq!(
            preparation_observation_error(&frame(&input)),
            "headless_message.payload"
        );
    }
    for index in 0..5 {
        let mut input = original.clone();
        input["payload"]["negative_checks"][index]["id"] = json!("wrong");
        assert_eq!(
            preparation_observation_error(&frame(&input)),
            "headless_message.payload"
        );
        let mut input = original.clone();
        input["payload"]["negative_checks"][index]["errno"] = json!(0);
        assert_eq!(
            preparation_observation_error(&frame(&input)),
            "headless_message.payload"
        );
    }
}

#[test]
fn headless_startup_messages_all_entrypoints_require_their_exact_family() {
    for (input, decode) in [
        (
            action_observation(),
            action_observation_error as fn(&[u8]) -> &'static str,
        ),
        (
            preparation_13(),
            preparation_observation_error as fn(&[u8]) -> &'static str,
        ),
        (
            action_release(),
            action_release_error as fn(&[u8]) -> &'static str,
        ),
        (
            result_completed(),
            action_result_error as fn(&[u8]) -> &'static str,
        ),
    ] {
        for (key, replacement) in [
            ("contract_id", json!("wrong")),
            ("contract_version", json!("wrong")),
            ("schema_version", json!(0)),
            ("message_type", json!("wrong")),
        ] {
            let mut changed = value(&input);
            changed[key] = replacement;
            assert_eq!(decode(&frame(&changed)), "headless_message.family");
        }
    }
}

#[test]
fn headless_startup_messages_git_head_and_repository_paths_have_exact_byte_edges() {
    let original = value(&action_release());
    let mut input = original.clone();
    let head = format!("refs/heads/{}", "a".repeat(245));
    assert_eq!(head.len(), 256);
    input["payload"]["execution_request"]["action"]["arguments"]["head_ref"] = json!(head);
    input["payload"]["execution_request"]["target"]["identity"]["head_ref"] = json!(head);
    rebind_release(&mut input);
    decode_action_release(&frame(&input)).expect("exact 256-byte head representation");
    input["payload"]["execution_request"]["action"]["arguments"]["head_ref"] =
        json!(format!("{head}a"));
    input["payload"]["execution_request"]["target"]["identity"]["head_ref"] =
        json!(format!("{head}a"));
    assert_eq!(
        action_release_error(&frame(&input)),
        "headless_message.payload"
    );

    for field in ["repository_path", "git_dir_path"] {
        let mut input = original.clone();
        let pathname = format!("/{}", "a".repeat(4095));
        assert_eq!(pathname.len(), 4096);
        input["payload"]["execution_request"]["target"]["identity"][field] = json!(pathname);
        rebind_release(&mut input);
        decode_action_release(&frame(&input)).expect("exact 4096-byte target path representation");
        input["payload"]["execution_request"]["target"]["identity"][field] =
            json!(format!("{pathname}a"));
        assert_eq!(
            action_release_error(&frame(&input)),
            "headless_message.json_limits"
        );
    }
}
