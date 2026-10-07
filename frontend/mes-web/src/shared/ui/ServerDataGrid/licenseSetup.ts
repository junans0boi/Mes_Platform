import { LicenseInfo } from '@mui/x-license';

// 라이선스 키는 클라이언트 키이며 .env.local의 VITE_MUIX_LICENSE_KEY로만 주입한다. 없으면 평가판 표시가 붙는다.
const key = import.meta.env.VITE_MUIX_LICENSE_KEY;
if (key) LicenseInfo.setLicenseKey(key);
