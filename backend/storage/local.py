import os
import uuid
import shutil
from werkzeug.utils import secure_filename
from flask import current_app

class LocalStorageService:
    def __init__(self):
        pass

    @property
    def base_path(self):
        return current_app.config['STORAGE_PATH']
    
    def _ensure_dir(self):
        os.makedirs(self.base_path, exist_ok=True)

    def save_file(self, file_obj, subfolder=None) -> str:
        """Saves a file and returns its relative storage path."""
        self._ensure_dir()
        filename = secure_filename(file_obj.filename)
        unique_name = f"{uuid.uuid4()}_{filename}"
        
        target_dir = self.base_path
        if subfolder:
            target_dir = os.path.join(self.base_path, subfolder)
            os.makedirs(target_dir, exist_ok=True)
            
        full_path = os.path.join(target_dir, unique_name)
        file_obj.save(full_path)
        
        if subfolder:
            return os.path.join(subfolder, unique_name)
        return unique_name

    def save_bytes(self, file_bytes: bytes, filename: str, subfolder=None) -> str:
        """Saves raw bytes to a file and returns relative path."""
        self._ensure_dir()
        safe_filename = secure_filename(filename)
        unique_name = f"{uuid.uuid4()}_{safe_filename}"
        
        target_dir = self.base_path
        if subfolder:
            target_dir = os.path.join(self.base_path, subfolder)
            os.makedirs(target_dir, exist_ok=True)
            
        full_path = os.path.join(target_dir, unique_name)
        with open(full_path, 'wb') as f:
            f.write(file_bytes)
            
        if subfolder:
            return os.path.join(subfolder, unique_name)
        return unique_name

    def get_absolute_path(self, relative_path: str) -> str:
        return os.path.join(self.base_path, relative_path)

    def delete_file(self, relative_path: str):
        full_path = self.get_absolute_path(relative_path)
        if os.path.exists(full_path):
            os.remove(full_path)

storage_service = LocalStorageService()
