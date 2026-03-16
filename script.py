import os
import subprocess
import sys
import venv
from pathlib import Path

def run_command(command, cwd, shell=True):
    return subprocess.run(command, cwd=cwd, shell=shell, check=True)

def start_service(command, cwd):
    # Ensure the directory exists before starting
    if not os.path.isdir(cwd):
        print(f"ERROR: Directory not found: {cwd}")
        return None
    return subprocess.Popen(command, cwd=cwd, shell=True)

def setup_environment():
    root_dir = Path.cwd()
    venv_dir = root_dir / ".venv"  # Changed to match your terminal's '.venv'
    
    # --- CHECK THESE PATHS ---
    # Ensure these match your actual folder names exactly
    ml_dir = root_dir  / "ml_engine" 
    frontend_dir = root_dir / "frontend"
    backend_node_dir = root_dir / "backend"
    # -------------------------

    # 1. Virtual Environment Setup
    if not venv_dir.exists():
        print("Creating virtual environment...")
        venv.create(venv_dir, with_pip=True)
    
    if sys.platform == "win32":
        python_exe = venv_dir / "Scripts" / "python.exe"
        pip_exe = venv_dir / "Scripts" / "pip.exe"
    else:
        python_exe = venv_dir / "bin" / "python"
        pip_exe = venv_dir / "bin" / "pip"

    # 2. Python Dependency Installation
    requirements_path = ml_dir / "requirement.txt"
    if requirements_path.exists():
        print(f"Installing requirements from {requirements_path}...")
        run_command(f'"{pip_exe}" install -r requirement.txt', cwd=ml_dir)

    # 3. Node Modules Installation
    for folder in [frontend_dir, backend_node_dir]:
        if folder.exists() and not (folder / "node_modules").exists():
            print(f"Installing node_modules in {folder.name}...")
            run_command("npm install", cwd=folder)

    # 4. Execution of Services
    processes = []
    try:
        print("Starting services...")
        
        # Start Frontend
        p_front = start_service("npm run dev", frontend_dir)
        if p_front: processes.append(p_front)
        
        # Start Node Backend
        p_back = start_service("npm start", backend_node_dir)
        if p_back: processes.append(p_back)
        
        # Start ML Engine (Uvicorn)
        uvicorn_cmd = f'"{python_exe}" -m uvicorn main:app --reload --port 8000'
        p_ml = start_service(uvicorn_cmd, ml_dir)
        if p_ml: processes.append(p_ml)

        print("\nAll systems go! Press Ctrl+C to exit.\n")
        
        for p in processes:
            p.wait()

    except KeyboardInterrupt:
        print("\nStopping all services...")
        for p in processes:
            p.terminate()

if __name__ == "__main__":
    setup_environment()