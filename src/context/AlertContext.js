import React, { createContext, useContext, useState } from 'react';
import AwesomeAlert from 'react-native-awesome-alerts';
import { colors } from '../theme/colors';

const AlertContext = createContext();

export const useAlert = () => useContext(AlertContext);

export const AlertProvider = ({ children }) => {
  const [alertConfig, setAlertConfig] = useState({
    show: false,
    title: '',
    message: '',
    showCancelButton: true,
    showConfirmButton: true,
    cancelText: 'Cancel',
    confirmText: 'OK',
    onCancelPressed: () => {},
    onConfirmPressed: () => {},
  });

  const showAlert = (options) => {
    setAlertConfig({
      show: true,
      title: options.title || '',
      message: options.message || '',
      showCancelButton: options.showCancelButton ?? true,
      showConfirmButton: options.showConfirmButton ?? true,
      cancelText: options.cancelText || 'Cancel',
      confirmText: options.confirmText || 'OK',
      onCancelPressed: () => {
        setAlertConfig(prev => ({ ...prev, show: false }));
        if (options.onCancelPressed) options.onCancelPressed();
      },
      onConfirmPressed: () => {
        setAlertConfig(prev => ({ ...prev, show: false }));
        if (options.onConfirmPressed) options.onConfirmPressed();
      },
    });
  };

  const hideAlert = () => {
    setAlertConfig(prev => ({ ...prev, show: false }));
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <AwesomeAlert
        show={alertConfig.show}
        showProgress={false}
        title={alertConfig.title}
        message={alertConfig.message}
        closeOnTouchOutside={false}
        closeOnHardwareBackPress={false}
        showCancelButton={alertConfig.showCancelButton}
        showConfirmButton={alertConfig.showConfirmButton}
        cancelText={alertConfig.cancelText}
        confirmText={alertConfig.confirmText}
        confirmButtonColor={colors.gold || '#f5c518'}
        cancelButtonColor="#e0e0e0"
        cancelButtonTextStyle={{ color: '#333' }}
        onCancelPressed={alertConfig.onCancelPressed}
        onConfirmPressed={alertConfig.onConfirmPressed}
        titleStyle={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}
        messageStyle={{ fontSize: 15, color: '#555', textAlign: 'center' }}
        contentContainerStyle={{ borderRadius: 12, padding: 20 }}
      />
    </AlertContext.Provider>
  );
};
