# services/cleanup_service.py
"""
임시 파일 정리 서비스
"""

import os
import time
import logging
from pathlib import Path


class CleanupService:
    """임시 파일 정리 서비스"""
    
    def __init__(self):
        self.temp_dir = "uploads/temp"
        self.max_age_hours = 24  # 24시간 후 삭제
    
    def cleanup_temp_files(self):
        """24시간 지난 임시 파일들 삭제"""
        try:
            if not os.path.exists(self.temp_dir):
                return
            
            current_time = time.time()
            max_age_seconds = self.max_age_hours * 3600
            deleted_count = 0
            
            for filename in os.listdir(self.temp_dir):
                file_path = os.path.join(self.temp_dir, filename)
                
                # 파일인지 확인
                if not os.path.isfile(file_path):
                    continue
                
                # 파일 생성 시간 확인
                file_age = current_time - os.path.getctime(file_path)
                
                if file_age > max_age_seconds:
                    try:
                        os.remove(file_path)
                        deleted_count += 1
                        logging.info(f"임시 파일 삭제: {filename}")
                    except Exception as e:
                        logging.error(f"파일 삭제 실패 {filename}: {e}")
            
            if deleted_count > 0:
                logging.info(f"총 {deleted_count}개 임시 파일 정리 완료")
                
        except Exception as e:
            logging.error(f"임시 파일 정리 중 오류: {e}")
    
    def cleanup_orphaned_temp_files(self):
        """분석했지만 이벤트로 생성되지 않은 임시 파일들 정리 (1시간 후)"""
        try:
            if not os.path.exists(self.temp_dir):
                return
            
            current_time = time.time()
            orphan_age_seconds = 3600  # 1시간
            deleted_count = 0
            
            for filename in os.listdir(self.temp_dir):
                file_path = os.path.join(self.temp_dir, filename)
                
                if not os.path.isfile(file_path):
                    continue
                
                file_age = current_time - os.path.getctime(file_path)
                
                # 1시간 지난 파일은 고아 파일로 간주
                if file_age > orphan_age_seconds:
                    try:
                        os.remove(file_path)
                        deleted_count += 1
                        logging.info(f"고아 임시 파일 삭제: {filename}")
                    except Exception as e:
                        logging.error(f"고아 파일 삭제 실패 {filename}: {e}")
            
            if deleted_count > 0:
                logging.info(f"총 {deleted_count}개 고아 임시 파일 정리 완료")
                
        except Exception as e:
            logging.error(f"고아 파일 정리 중 오류: {e}")


# 서비스 인스턴스
cleanup_service = CleanupService()