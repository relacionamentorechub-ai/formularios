#!/usr/bin/env python3
import subprocess
import sys

json_path = r"C:\Users\Usuario\Downloads\REC - HUB COMPLETO\REC - HUB COMPLETO\venues_canoas_temp.json"
script_path = r"C:\Users\Usuario\AppData\Roaming\Claude\local-agent-mode-sessions\skills-plugin\5eae051a-ac68-405c-bf75-f545c49cf73e\ab889381-de7e-4a07-9923-2f691cf3cdcc\skills\pesquisa-locais-eventos\scripts\create_venues_xlsx.py"

result = subprocess.run([sys.executable, script_path, json_path], capture_output=True, text=True)
print(result.stdout)
if result.stderr:
    print("STDERR:", result.stderr)
print("Return code:", result.returncode)
