import os
import subprocess
import sys
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
    
    # --- CHECK THESE PATHS ---
    frontend_dir = root_dir / "Frontend" # Make sure this matches your folder casing
    backend_node_dir = root_dir / "backend"
    # -------------------------

    # 1. Node Modules Installation
    for folder in [frontend_dir, backend_node_dir]:
        if folder.exists() and not (folder / "node_modules").exists():
            print(f"Installing node_modules in {folder.name}...")
            run_command("npm install", cwd=folder)

    # 2. Execution of Services
    processes = []
    try:
        print("Starting services...")
        
        # Start Frontend
        p_front = start_service("npm run dev", frontend_dir)
        if p_front: processes.append(p_front)
        
        # Start Node Backend
        p_back = start_service("npm start", backend_node_dir)
        if p_back: processes.append(p_back)
        
        print("\nAll systems go! Press Ctrl+C to exit.\n")
        
        for p in processes:
            p.wait()

    except KeyboardInterrupt:
        print("\nStopping all services...")
        for p in processes:
            p.terminate()

if __name__ == "__main__":
    setup_environment()