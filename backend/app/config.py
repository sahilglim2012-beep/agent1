import os
from pathlib import Path
from dotenv import load_dotenv, set_key

# Define paths
BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_FILE_PATH = BACKEND_DIR / ".env"

# Ensure .env file exists
if not ENV_FILE_PATH.exists():
    ENV_FILE_PATH.touch()

# Load env variables from .env
load_dotenv(dotenv_path=ENV_FILE_PATH)

def get_api_keys():
    """Retrieve keys from environment or .env file."""
    # Reload environment to pick up latest edits to .env
    load_dotenv(dotenv_path=ENV_FILE_PATH, override=True)
    return {
        "gemini_api_key": os.getenv("GEMINI_API_KEY", ""),
        "openai_api_key": os.getenv("OPENAI_API_KEY", ""),
        "active_provider": os.getenv("ACTIVE_PROVIDER", "gemini"),  # gemini or openai
    }

def save_api_keys(gemini_key: str = None, openai_key: str = None, active_provider: str = None):
    """Save keys to the .env file."""
    str_path = str(ENV_FILE_PATH)
    
    if gemini_key is not None:
        set_key(str_path, "GEMINI_API_KEY", gemini_key)
        os.environ["GEMINI_API_KEY"] = gemini_key
        
    if openai_key is not None:
        set_key(str_path, "OPENAI_API_KEY", openai_key)
        os.environ["OPENAI_API_KEY"] = openai_key
        
    if active_provider is not None:
        set_key(str_path, "ACTIVE_PROVIDER", active_provider)
        os.environ["ACTIVE_PROVIDER"] = active_provider
        
    # Reload environment variables after writing
    load_dotenv(dotenv_path=ENV_FILE_PATH, override=True)
    return get_api_keys()
