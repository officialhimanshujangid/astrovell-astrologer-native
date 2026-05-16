import { useSelector } from 'react-redux';
import { translations } from '../utils/translations';

const useTranslation = () => {
  const globalLang = useSelector((state) => state.auth.globalLang) || 'en';

  const t = (key) => {
    return translations[globalLang]?.[key] || translations['en']?.[key] || key;
  };

  return { t, globalLang };
};

export default useTranslation;
