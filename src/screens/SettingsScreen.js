import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, BackHandler, Linking, Image, Modal, Animated, PanResponder, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import { useAlert } from '../context/AlertContext';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { colors } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';
import useTranslation from '../hooks/useTranslation';
import { profileApi, pageApi, authApi } from '../api/services';
import { SOCKET_BASE } from '../api/apiClient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const maskAccountNumber = (num) => {
  if (!num) return '•••• •••• •••• ••••';
  const str = num.toString().trim();
  if (str.length <= 4) return str;
  return `•••• •••• •••• ${str.slice(-4)}`;
};

const getForm16aUrl = (filePath) => {
  if (!filePath) return '';
  if (filePath.startsWith('http')) return filePath;
  let path = filePath;
  if (path.startsWith('/')) {
    path = path.substring(1);
  }
  return `${SOCKET_BASE}/${path}`;
};

const generateHtmlTemplate = (bodyContent) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #F7F7F7;
          color: #1A1A1A;
          padding: 16px;
          margin: 0;
          font-size: 15px;
          line-height: 1.6;
        }
        p {
          margin-bottom: 16px;
        }
        h1, h2, h3, h4, h5, h6 {
          color: #E6A800;
          font-weight: bold;
          margin-top: 24px;
          margin-bottom: 12px;
        }
        a {
          color: #E6A800;
          text-decoration: none;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      ${bodyContent}
    </body>
  </html>
`;

const getYoutubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const SettingsScreen = ({ onBack, initialSubScreen }) => {
  const { t, globalLang } = useTranslation();
  const { astrologer } = useSelector((s) => s.auth);
  const [activeSubScreen, setActiveSubScreen] = useState(initialSubScreen || null);
  const [openedDirectly] = useState(!!initialSubScreen);
  const { showAlert } = useAlert();

  const handleBack = () => {
    if (openedDirectly) {
      onBack();
    } else {
      setActiveSubScreen(null);
    }
  };

  useEffect(() => {
    if (initialSubScreen) {
      setActiveSubScreen(initialSubScreen);
    }
  }, [initialSubScreen]);

  const [profileDetails, setProfileDetails] = useState(null);
  const [phoneForm, setPhoneForm] = useState({ contactNo: '', whatsappNo: '' });
  const [newPhone, setNewPhone] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [receivedOtp, setReceivedOtp] = useState(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Bank Form State
  const [bankForm, setBankForm] = useState({
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    bankBranch: '',
    accountType: 'Saving',
    upi: '',
  });
  const [bankStatus, setBankStatus] = useState(null);
  const [bankFetchLoading, setBankFetchLoading] = useState(false);
  const [bankSaveLoading, setBankSaveLoading] = useState(false);

  // Form 16A State
  const [form16aList, setForm16aList] = useState([]);
  const [form16aLoading, setForm16aLoading] = useState(false);

  // Terms State
  const [termsContent, setTermsContent] = useState(null);
  const [termsLoading, setTermsLoading] = useState(false);

  // Training Video State
  const [videoList, setVideoList] = useState([]);
  const [videoLoading, setVideoLoading] = useState(false);
  const [activeVideo, setActiveVideo] = useState(null);

  // Gallery State
  const [galleryList, setGalleryList] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [tempImageUri, setTempImageUri] = useState(null);
  const [tempImageBase64, setTempImageBase64] = useState(null);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState(null);

  // Billing Address State
  const [billingAddress, setBillingAddress] = useState('');
  const [billingLoading, setBillingLoading] = useState(false);

  // Image adjustment states
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);

  const lastX = React.useRef(0);
  const lastY = React.useRef(0);

  const resetAdjustmentStates = () => {
    setScale(1);
    setRotation(0);
    setTranslateX(0);
    setTranslateY(0);
    lastX.current = 0;
    lastY.current = 0;
  };

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        setTranslateX(lastX.current + gestureState.dx / scale);
        setTranslateY(lastY.current + gestureState.dy / scale);
      },
      onPanResponderRelease: (evt, gestureState) => {
        lastX.current += gestureState.dx / scale;
        lastY.current += gestureState.dy / scale;
      },
    })
  ).current;

  // Load Phone Data
  const loadPhoneData = async () => {
    setFetchLoading(true);
    try {
      const res = await profileApi.get({ astrologerId: astrologer?.id });
      const d = res.data;
      const a = d?.recordList?.[0] || d?.data || d?.recordList || {};
      setProfileDetails(a);
      setPhoneForm({
        contactNo: a.contactNo || '',
        whatsappNo: a.whatsappNo || '',
      });
    } catch (err) {
      Toast.show({ type: 'error', text1: t('error'), text2: 'Failed to load contact information.' });
    } finally {
      setFetchLoading(false);
    }
  };

  // Load Bank Data
  const loadBankData = async () => {
    setBankFetchLoading(true);
    try {
      const res = await profileApi.getBankStatus({ astrologerId: astrologer?.id });
      const d = res.data;
      if (d?.status === 200 || res.status === 200) {
        setBankStatus(d);
        const current = d.current || {};
        setBankForm({
          accountHolderName: current.accountHolderName || '',
          accountNumber: current.accountNumber || '',
          ifscCode: current.ifscCode || '',
          bankName: current.bankName || '',
          bankBranch: current.bankBranch || '',
          accountType: current.accountType || 'Saving',
          upi: current.upi || '',
        });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: t('error'), text2: 'Failed to load bank details.' });
    } finally {
      setBankFetchLoading(false);
    }
  };

  // Load Form 16A Data
  const loadForm16aData = async () => {
    setForm16aLoading(true);
    try {
      const res = await profileApi.getForm16a({ astrologerId: astrologer?.id });
      const d = res.data;
      if (d?.status === 200 || res.status === 200) {
        setForm16aList(d.recordList || []);
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: t('error'), text2: 'Failed to load Form 16A documents.' });
    } finally {
      setForm16aLoading(false);
    }
  };

  const handleDownloadForm16a = async (filePath) => {
    const url = getForm16aUrl(filePath);
    if (!url) {
      Toast.show({ type: 'error', text1: t('error'), text2: 'Document link is invalid.' });
      return;
    }
    
    setForm16aLoading(true);
    try {
      // Create a filename from the URL or use a default
      let fileName = url.split('/').pop();
      if (!fileName || !fileName.includes('.')) {
        fileName = 'Form16A.pdf'; // default fallback
      }
      const fileUri = FileSystem.documentDirectory + fileName;
      
      // Download the file directly to internal cache first
      const { uri } = await FileSystem.downloadAsync(url, fileUri);
      
      if (Platform.OS === 'android') {
        try {
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (permissions.granted) {
            const base64Data = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
            const savedUri = await FileSystem.StorageAccessFramework.createFileAsync(
              permissions.directoryUri,
              fileName,
              'application/pdf'
            );
            await FileSystem.writeAsStringAsync(savedUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
            Toast.show({ type: 'success', text1: t('success') || 'Success', text2: 'File saved successfully!' });
            setForm16aLoading(false);
            return;
          }
        } catch (e) {
          console.log('SAF Error:', e);
        }
      }
      
      // Fallback for iOS or if Android user cancels directory selection
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' });
      } else {
        Toast.show({ type: 'success', text1: t('success') || 'Success', text2: 'File downloaded to: ' + uri });
      }
    } catch (err) {
      console.log('Download error:', err);
      Toast.show({ type: 'error', text1: t('error'), text2: 'Failed to download: ' + (err.message || 'Unknown error') });
    } finally {
      setForm16aLoading(false);
    }
  };

  // Load Terms & Conditions
  const loadTermsContent = async () => {
    setTermsLoading(true);
    try {
      const res = await pageApi.getPage('refund-policy');
      const d = res.data;
      if (d?.status === 200 || res.status === 200) {
        const record = d.recordList?.[0] || d.data?.[0] || d.data || {};
        setTermsContent(record);
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: t('error'), text2: 'Failed to load terms and conditions.' });
    } finally {
      setTermsLoading(false);
    }
  };

  // Load Training Videos
  const loadVideoData = async () => {
    setVideoLoading(true);
    try {
      const res = await profileApi.getTrainingVideos({ type: 'astrologer' });
      const d = res.data;
      if (d?.status === 200 || res.status === 200) {
        setVideoList(d.recordList || []);
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: t('error'), text2: 'Failed to load training videos.' });
    } finally {
      setVideoLoading(false);
    }
  };

  const handlePlayVideo = async (video) => {
    if (!video || !video.video_link) return;
    const yId = getYoutubeId(video.video_link);
    if (yId) {
      setActiveVideo(video);
    } else {
      try {
        const supported = await Linking.canOpenURL(video.video_link);
        if (supported) {
          await Linking.openURL(video.video_link);
        } else {
          Toast.show({ type: 'error', text1: t('error'), text2: 'Cannot open video URL: ' + video.video_link });
        }
      } catch (err) {
        Toast.show({ type: 'error', text1: t('error'), text2: 'An error occurred while opening the video link.' });
      }
    }
  };

  // Load Gallery Data
  const loadGalleryData = async () => {
    setGalleryLoading(true);
    try {
      const res = await profileApi.getGallery({ astrologerId: astrologer?.id });
      const d = res.data;
      if (d?.status === 200 || res.status === 200) {
        setGalleryList(d.recordList || []);
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: t('error'), text2: 'Failed to load gallery images.' });
    } finally {
      setGalleryLoading(false);
    }
  };

  // Toggle Gallery image active/inactive (show/hide)
  const handleToggleGallery = async (id) => {
    try {
      const res = await profileApi.toggleGallery({ id });
      if (res.data?.status === 200 || res.status === 200) {
        setGalleryList(prev => prev.map(item => item.id === id ? { ...item, isActive: item.isActive === 1 ? 0 : 1 } : item));
        Toast.show({ type: 'success', text1: t('success') || 'Success', text2: res.data?.message || 'Status updated' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: t('error'), text2: 'Failed to toggle image status.' });
    }
  };

  // Delete Gallery image
  const handleDeleteGallery = async (id) => {
    showAlert({
      title: globalLang === 'hi' ? 'छवि हटाएं' : 'Delete Image',
      message: globalLang === 'hi' ? 'क्या आप वाकई इस छवि को हटाना चाहते हैं?' : 'Are you sure you want to delete this image?',
      cancelText: t('cancel') || 'Cancel',
      confirmText: globalLang === 'hi' ? 'हटाएं' : 'Delete',
      onConfirmPressed: async () => {
        try {
          const res = await profileApi.deleteGallery({ id });
          if (res.data?.status === 200 || res.status === 200) {
            setGalleryList(prev => prev.filter(item => item.id !== id));
            Toast.show({ type: 'success', text1: t('success') || 'Success', text2: res.data?.message || 'Photo deleted' });
          }
        } catch (err) {
          Toast.show({ type: 'error', text1: t('error'), text2: 'Failed to delete image.' });
        }
      }
    });
  };

  // Pick and Upload Image
  const handleUploadGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      showAlert({
        title: globalLang === 'hi' ? 'अनुमति आवश्यक है' : "Permission Required",
        message: globalLang === 'hi' ? 'छवि अपलोड करने के लिए आपको फ़ोटो एक्सेस की अनुमति देनी होगी।' : "You need to allow access to your photos to upload images.",
        showCancelButton: false,
        confirmText: 'OK'
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false, // Avoid native editor issues
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedAsset = result.assets[0];
      setTempImageUri(selectedAsset.uri);
      setTempImageBase64(selectedAsset.base64);
      resetAdjustmentStates();
      setAdjustModalVisible(true);
    }
  };

  // Confirm and upload selected image from Adjust Modal
  const confirmUploadGallery = async () => {
    if (!tempImageUri) return;
    setUploadLoading(true);

    try {
      let width = 0;
      let height = 0;

      // Get original image dimensions
      await new Promise((resolve) => {
        Image.getSize(
          tempImageUri,
          (w, h) => {
            width = w;
            height = h;
            resolve();
          },
          () => {
            // fallback if getSize fails
            width = 800;
            height = 800;
            resolve();
          }
        );
      });

      let currentUri = tempImageUri;
      let currentWidth = width;
      let currentHeight = height;

      const manipActions = [];

      // 1. First, apply rotation if any
      if (rotation !== 0) {
        const rotResult = await ImageManipulator.manipulateAsync(
          currentUri,
          [{ rotate: rotation }],
          { format: ImageManipulator.SaveFormat.PNG }
        );
        currentUri = rotResult.uri;
        currentWidth = rotResult.width;
        currentHeight = rotResult.height;
      }

      // 2. Compute crop box calculation (crop box is square 300x300, and image uses resizeMode cover)
      const boxSize = 300;
      const scaleFactor = Math.max(boxSize / currentWidth, boxSize / currentHeight);
      const displayedWidth = currentWidth * scaleFactor;
      const displayedHeight = currentHeight * scaleFactor;
      const displayScale = displayedWidth / currentWidth;

      // cropSizeInOriginal represents the width/height of the crop frame in original pixel space
      const cropSizeInOriginal = (boxSize / scale) / displayScale;
      
      // originX0, originY0 is the default centered crop position in original pixels
      const originX0 = (currentWidth - cropSizeInOriginal) / 2;
      const originY0 = (currentHeight - cropSizeInOriginal) / 2;

      // Shift based on translateX / translateY (touch dragging moves image opposite of crop origin)
      const originX = originX0 - (translateX / scale) / displayScale;
      const originY = originY0 - (translateY / scale) / displayScale;

      // Clamp coordinates to remain within image boundaries
      const finalOriginX = Math.round(Math.max(0, Math.min(currentWidth - cropSizeInOriginal, originX)));
      const finalOriginY = Math.round(Math.max(0, Math.min(currentHeight - cropSizeInOriginal, originY)));
      const finalSize = Math.round(Math.min(cropSizeInOriginal, currentWidth - finalOriginX, currentHeight - finalOriginY));

      manipActions.push({
        crop: {
          originX: finalOriginX,
          originY: finalOriginY,
          width: finalSize,
          height: finalSize,
        }
      });

      // Resize the cropped area to 600x600 for standard gallery resolution and optimized upload sizes
      manipActions.push({
        resize: {
          width: 600,
          height: 600
        }
      });

      const cropResult = await ImageManipulator.manipulateAsync(
        currentUri,
        manipActions,
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true
        }
      );

      const base64Data = `data:image/jpeg;base64,${cropResult.base64}`;

      const res = await profileApi.addGallery({
        astrologerId: astrologer?.id,
        images: [base64Data]
      });

      if (res.data?.status === 200 || res.status === 200) {
        Toast.show({ type: 'success', text1: t('success') || 'Success', text2: res.data?.message || 'Photo uploaded' });
        setAdjustModalVisible(false);
        loadGalleryData(); // Refresh list
      }
    } catch (err) {
      console.log('Image processing error:', err);
      Toast.show({ type: 'error', text1: t('error'), text2: 'Failed to process and upload image.' });
    } finally {
      setUploadLoading(false);
    }
  };

  // Load Billing Address Data
  const loadBillingData = async () => {
    setBillingLoading(true);
    try {
      const res = await profileApi.get({ astrologerId: astrologer?.id });
      const d = res.data;
      const a = d?.recordList?.[0] || d?.data || d?.recordList || {};
      setBillingAddress(a.billingAddress || '');
    } catch (err) {
      console.log('Failed to load billing address:', err);
    } finally {
      setBillingLoading(false);
    }
  };

  // Submit Updated Billing Address
  const handleUpdateBillingAddress = async () => {
    if (!billingAddress.trim()) {
      Toast.show({ type: 'error', text1: t('error'), text2: globalLang === 'hi' ? 'कृपया बिलिंग पता दर्ज करें।' : 'Please enter a billing address.' });
      return;
    }
    setSaveLoading(true);
    try {
      const res = await profileApi.updateBillingAddress({
        astrologerId: astrologer?.id,
        billingAddress: billingAddress.trim(),
      });
      const d = res.data;
      if (d?.status === 200 || res.status === 200) {
        Toast.show({
          type: 'success',
          text1: `✅ ${t('success')}`,
          text2: d.message || (globalLang === 'hi' ? 'बिलिंग पता सफलतापूर्वक अपडेट किया गया।' : 'Billing address updated successfully.')
        });
        handleBack();
      } else {
        Toast.show({ type: 'error', text1: t('error'), text2: d?.message || 'Failed to update billing address.' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: t('error'), text2: err.response?.data?.message || 'Failed to update billing address.' });
    } finally {
      setSaveLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubScreen === 'phone') {
      loadPhoneData();
    } else if (activeSubScreen === 'bank') {
      loadBankData();
    } else if (activeSubScreen === 'form16a') {
      loadForm16aData();
    } else if (activeSubScreen === 'terms') {
      loadTermsContent();
    } else if (activeSubScreen === 'training') {
      loadVideoData();
    } else if (activeSubScreen === 'gallery') {
      loadGalleryData();
    } else if (activeSubScreen === 'billing') {
      loadBillingData();
    }
  }, [activeSubScreen]);

  useEffect(() => {
    if (!activeSubScreen) return;

    const handleHardwareBack = () => {
      handleBack();
      return true; // prevent default (global back handler)
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleHardwareBack);
    return () => subscription.remove();
  }, [activeSubScreen]);

  const handleSendOtp = async () => {
    if (!newPhone.trim()) {
      Toast.show({ type: 'error', text1: t('error'), text2: 'Please enter a valid phone number.' });
      return;
    }
    setOtpLoading(true);
    try {
      const payload = {
        contactNo: newPhone.trim(),
        fromApp: 'astrologer',
        type: 'register',
        countryCode: '91',
      };
      const res = await authApi.sendOtp(payload);
      const d = res.data;
      if (d?.status === 200 || res.status === 200) {
        setReceivedOtp(d.otp);
        setOtpSent(true);
        Toast.show({
          type: 'success',
          text1: `📩 ${t('success')}`,
          text2: `${d.message || 'OTP sent successfully.'}\n(For testing: OTP is ${d.otp})`
        });
      } else {
        Toast.show({ type: 'error', text1: t('error'), text2: d?.message || 'Failed to send OTP.' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: t('error'), text2: err.response?.data?.message || 'Failed to send OTP.' });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyAndUpdatePhone = async () => {
    if (!otpInput.trim()) {
      Toast.show({ type: 'error', text1: t('error'), text2: 'Please enter the OTP.' });
      return;
    }
    if (otpInput.trim() !== String(receivedOtp)) {
      Toast.show({ type: 'error', text1: t('error'), text2: 'Incorrect OTP. Please check and try again.' });
      return;
    }
    setSaveLoading(true);
    try {
      const payload = {
        astrologerId: astrologer?.id,
        contactNo: newPhone.trim(),
      };
      const res = await profileApi.changeContactNo(payload);
      const d = res.data;
      if (d?.status === 200 || res.status === 200) {
        Toast.show({ type: 'success', text1: `✅ ${t('success')}`, text2: d.message || 'Mobile number updated successfully.' });
        // Refetch profile details and clear state
        await loadPhoneData();
        setNewPhone('');
        setOtpInput('');
        setReceivedOtp(null);
        setOtpSent(false);
        handleBack();
      } else {
        Toast.show({ type: 'error', text1: t('error'), text2: d?.message || 'Failed to update phone number.' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: t('error'), text2: err.response?.data?.message || 'Failed to update phone number.' });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleUpdateBank = async () => {
    if (!bankForm.accountNumber.trim() || !bankForm.ifscCode.trim() || !bankForm.bankName.trim()) {
      Toast.show({ type: 'error', text1: t('error'), text2: 'Account Number, IFSC Code and Bank Name are required.' });
      return;
    }
    setBankSaveLoading(true);
    try {
      const payload = {
        astrologerId: astrologer?.id,
        accountHolderName: bankForm.accountHolderName,
        accountNumber: bankForm.accountNumber,
        ifscCode: bankForm.ifscCode,
        bankName: bankForm.bankName,
        bankBranch: bankForm.bankBranch,
        accountType: bankForm.accountType,
        upi: bankForm.upi,
      };
      const res = await profileApi.requestBankUpdate(payload);
      if (res.data?.status === 200 || res.status === 200) {
        Toast.show({
          type: 'success',
          text1: `✅ ${t('success')}`,
          text2: res.data?.message || 'Bank update request submitted. Awaiting admin approval.'
        });
        handleBack();
      } else {
        Toast.show({ type: 'error', text1: t('error'), text2: res.data?.message || 'Failed to submit request.' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: t('error'), text2: err.response?.data?.message || 'Failed to submit bank update request.' });
    } finally {
      setBankSaveLoading(false);
    }
  };

  const SETTING_ITEMS = [
    {
      key: 'phone',
      title: t('update_phone'),
      emoji: '📱',
      desc: globalLang === 'hi' ? 'अपने संपर्क विवरण और व्हाट्सएप नंबर अपडेट करें।' : 'Update your contact details and WhatsApp numbers.',
      color: colors.iconPink
    },
    {
      key: 'training',
      title: t('training_video'),
      emoji: '🎥',
      desc: globalLang === 'hi' ? 'Astrovell के साथ शुरू करने के लिए प्रशिक्षण वीडियो देखें।' : 'Watch training videos to get started with Astrovell.',
      color: colors.iconBlue
    },
    {
      key: 'terms',
      title: t('terms_conditions'),
      emoji: '📜',
      desc: globalLang === 'hi' ? 'पार्टनर समझौते के नियम और शर्तें पढ़ें।' : 'Read the partner agreement terms and conditions.',
      color: colors.iconYellow
    },
    {
      key: 'bank',
      title: t('bank_details'),
      emoji: '🏦',
      desc: globalLang === 'hi' ? 'अपनी भुगतान बैंक खाता जानकारी देखें और अपडेट करें।' : 'View and update your payout bank account information.',
      color: colors.iconPurple
    },
    {
      key: 'form16a',
      title: t('download_form16a'),
      emoji: '📄',
      desc: globalLang === 'hi' ? 'अपना त्रैमासिक टीडीएस प्रमाणपत्र / फॉर्म 16A डाउनलोड करें।' : 'Download your quarterly TDS certificate / Form 16A.',
      color: colors.iconTeal
    },
    {
      key: 'gallery',
      title: t('gallery'),
      emoji: '🖼️',
      desc: globalLang === 'hi' ? 'अपनी प्रोफ़ाइल गैलरी छवियों को प्रबंधित करें।' : 'Manage your profile gallery images.',
      color: colors.iconOrange
    },
    {
      key: 'billing',
      title: t('update_billing'),
      emoji: '📍',
      desc: globalLang === 'hi' ? 'अपने व्यावसायिक बिलिंग और जीएसटी पते को अपडेट करें।' : 'Update your business billing and GST address.',
      color: colors.iconPink
    },
  ];

  if (activeSubScreen) {
    if (activeSubScreen === 'phone') {
      return (
        <View style={styles.container}>
          <ScreenHeader title={t('update_phone')} onBack={handleBack} />
          {fetchLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.goldDark} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              <View style={styles.formContainer}>
                
                {/* Current Mobile Number (Read-only) */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>
                    {globalLang === 'hi' ? 'वर्तमान मोबाइल नंबर' : 'Current Mobile Number'}
                  </Text>
                  <View style={[styles.input, { backgroundColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                    <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>
                      {profileDetails?.contactNo || 'Not Configured'}
                    </Text>
                    <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
                  </View>
                </View>

                {/* New Mobile Number Input */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>
                    {globalLang === 'hi' ? 'नया मोबाइल नंबर' : 'New Mobile Number'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={newPhone}
                    onChangeText={setNewPhone}
                    keyboardType="phone-pad"
                    placeholderTextColor={colors.textLight}
                    placeholder={globalLang === 'hi' ? 'नया मोबाइल नंबर दर्ज करें' : 'Enter New Mobile Number'}
                    editable={!otpSent}
                  />
                </View>

                {/* OTP Input and Action */}
                {!otpSent ? (
                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: colors.goldDark }, otpLoading && { opacity: 0.6 }]}
                    onPress={handleSendOtp}
                    disabled={otpLoading}
                  >
                    {otpLoading ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <Text style={[styles.saveBtnText, { color: colors.white }]}>
                        {globalLang === 'hi' ? 'ओटीपी भेजें' : 'Send OTP'}
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View>
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>
                        {globalLang === 'hi' ? 'ओटीपी दर्ज करें' : 'Enter OTP'}
                      </Text>
                      <TextInput
                        style={styles.input}
                        value={otpInput}
                        onChangeText={setOtpInput}
                        keyboardType="number-pad"
                        placeholderTextColor={colors.textLight}
                        placeholder={globalLang === 'hi' ? '६-अंकीय ओटीपी दर्ज करें' : 'Enter 6-digit OTP'}
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.saveBtn, { backgroundColor: colors.goldDark }, saveLoading && { opacity: 0.6 }]}
                      onPress={handleVerifyAndUpdatePhone}
                      disabled={saveLoading}
                    >
                      {saveLoading ? (
                        <ActivityIndicator color={colors.white} />
                      ) : (
                        <Text style={[styles.saveBtnText, { color: colors.white }]}>
                          {globalLang === 'hi' ? 'सत्यापित करें और अपडेट करें' : 'Verify & Update'}
                        </Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.resendBtn}
                      onPress={handleSendOtp}
                      disabled={otpLoading}
                    >
                      {otpLoading ? (
                        <ActivityIndicator size="small" color={colors.goldDark} />
                      ) : (
                        <Text style={styles.resendText}>
                          {globalLang === 'hi' ? 'ओटीपी पुनः भेजें' : 'Resend OTP'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

              </View>
            </ScrollView>
          )}
        </View>
      );
    }

    if (activeSubScreen === 'bank') {
      return (
        <View style={styles.container}>
          <ScreenHeader title={t('bank_details')} onBack={handleBack} />
          {bankFetchLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.goldDark} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              
              <Text style={styles.sectionHeader}>{t('current_bank_details')}</Text>
              
              <LinearGradient
                colors={['#1e293b', '#0f172a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.bankCard}
              >
                <View style={styles.bankCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bankCardLabel}>{t('bank_name')}</Text>
                    <Text style={styles.bankCardValue} numberOfLines={1}>
                      {bankStatus?.current?.bankName || 'Not Linked'}
                    </Text>
                  </View>
                  <Ionicons name="card" size={32} color={colors.gold} style={{ opacity: 0.8 }} />
                </View>
                
                <Text style={styles.bankCardNumber}>
                  {maskAccountNumber(bankStatus?.current?.accountNumber)}
                </Text>
                
                <View style={styles.bankCardFooter}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.bankCardLabel}>{t('account_holder_name')}</Text>
                    <Text style={styles.bankCardValue} numberOfLines={1}>
                      {bankStatus?.current?.accountHolderName || 'Not Provided'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.bankCardLabel}>{t('ifsc_code')}</Text>
                    <Text style={styles.bankCardValue}>
                      {bankStatus?.current?.ifscCode || 'N/A'}
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              {bankStatus?.current && (
                <View style={styles.detailsList}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('bank_branch')}</Text>
                    <Text style={styles.detailValue}>{bankStatus.current.bankBranch || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('account_type')}</Text>
                    <Text style={styles.detailValue}>
                      {bankStatus.current.accountType === 'Saving' ? t('saving_type') : bankStatus.current.accountType === 'Current' ? t('current_type') : bankStatus.current.accountType || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('upi_id')}</Text>
                    <Text style={styles.detailValue}>{bankStatus.current.upi || 'N/A'}</Text>
                  </View>
                </View>
              )}

              {bankStatus?.latestRequest && (
                <View style={styles.pendingCard}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.pendingCardHeader}>
                      <Ionicons name="time-outline" size={20} color="#B45309" style={{ marginRight: 8 }} />
                      <Text style={styles.pendingText}>
                        {t('pending_admin_approval')}
                      </Text>
                    </View>
                    <View style={styles.pendingCardBody}>
                      <Text style={styles.pendingSubText}>
                        Requested Details:
                      </Text>
                      <View style={styles.pendingDetailsGrid}>
                        <Text style={styles.pendingDetailItem}>• {t('bank_name')}: {bankStatus.latestRequest.bankName}</Text>
                        <Text style={styles.pendingDetailItem}>• {t('account_number')}: {maskAccountNumber(bankStatus.latestRequest.accountNumber)}</Text>
                        {bankStatus.latestRequest.accountHolderName && (
                          <Text style={styles.pendingDetailItem}>• {t('account_holder_name')}: {bankStatus.latestRequest.accountHolderName}</Text>
                        )}
                        <Text style={styles.pendingDetailItem}>• {t('ifsc_code')}: {bankStatus.latestRequest.ifscCode}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              <Text style={styles.sectionHeader}>{t('request_details_update')}</Text>

              <View style={styles.formContainer}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>{t('account_holder_name')}</Text>
                  <TextInput
                    style={styles.input}
                    value={bankForm.accountHolderName}
                    onChangeText={(v) => setBankForm(prev => ({ ...prev, accountHolderName: v }))}
                    placeholderTextColor={colors.textLight}
                    placeholder="Enter Account Holder Name"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>{t('account_number')}</Text>
                  <TextInput
                    style={styles.input}
                    value={bankForm.accountNumber}
                    onChangeText={(v) => setBankForm(prev => ({ ...prev, accountNumber: v }))}
                    keyboardType="number-pad"
                    placeholderTextColor={colors.textLight}
                    placeholder="Enter Account Number"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>{t('ifsc_code')}</Text>
                  <TextInput
                    style={styles.input}
                    value={bankForm.ifscCode}
                    onChangeText={(v) => setBankForm(prev => ({ ...prev, ifscCode: v.toUpperCase() }))}
                    autoCapitalize="characters"
                    placeholderTextColor={colors.textLight}
                    placeholder="Enter IFSC Code"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>{t('bank_name')}</Text>
                  <TextInput
                    style={styles.input}
                    value={bankForm.bankName}
                    onChangeText={(v) => setBankForm(prev => ({ ...prev, bankName: v }))}
                    placeholderTextColor={colors.textLight}
                    placeholder="Enter Bank Name"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>{t('bank_branch')}</Text>
                  <TextInput
                    style={styles.input}
                    value={bankForm.bankBranch}
                    onChangeText={(v) => setBankForm(prev => ({ ...prev, bankBranch: v }))}
                    placeholderTextColor={colors.textLight}
                    placeholder="Enter Bank Branch"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>{t('account_type')}</Text>
                  <View style={styles.radioRow}>
                    {['Saving', 'Current'].map(type => (
                      <TouchableOpacity
                         key={type}
                         style={[styles.radioBtn, bankForm.accountType === type && styles.radioBtnActive]}
                         onPress={() => setBankForm(prev => ({ ...prev, accountType: type }))}
                      >
                        <Text style={[styles.radioText, bankForm.accountType === type && styles.radioTextActive]}>
                          {type === 'Saving' ? t('saving_type') : t('current_type')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>{t('upi_id')}</Text>
                  <TextInput
                    style={styles.input}
                    value={bankForm.upi}
                    onChangeText={(v) => setBankForm(prev => ({ ...prev, upi: v }))}
                    autoCapitalize="none"
                    placeholderTextColor={colors.textLight}
                    placeholder="Enter UPI ID (optional)"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.goldDark }, bankSaveLoading && { opacity: 0.6 }]}
                  onPress={handleUpdateBank}
                  disabled={bankSaveLoading}
                >
                  {bankSaveLoading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={[styles.saveBtnText, { color: colors.white }]}>{t('submit_bank_request')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      );
    }

    if (activeSubScreen === 'form16a') {
      return (
        <View style={styles.container}>
          <ScreenHeader title={t('download_form16a')} onBack={handleBack} />
          {form16aLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.goldDark} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              {form16aList.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="document-text-outline" size={60} color={colors.goldDark} />
                  </View>
                  <Text style={styles.emptyTitle}>{t('no_records_found')}</Text>
                  <Text style={styles.emptyDesc}>{t('no_form16a_desc')}</Text>
                </View>
              ) : (
                <View style={styles.docList}>
                  {form16aList.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.docCard}
                      activeOpacity={0.8}
                      onPress={() => handleDownloadForm16a(item.filePath)}
                    >
                      <View style={styles.docCardLeft}>
                        <View style={styles.pdfIconContainer}>
                          <Ionicons name="document" size={32} color="#EF4444" />
                          <Text style={styles.pdfBadge}>PDF</Text>
                        </View>
                      </View>
                      
                      <View style={styles.docCardMiddle}>
                        <Text style={styles.docTitle} numberOfLines={1}>
                          {item.fileName || 'Form 16A Document'}
                        </Text>
                        <View style={styles.docMetaRow}>
                          <Text style={styles.docMetaLabel}>{t('financial_year')}: </Text>
                          <Text style={styles.docMetaValue}>{item.financialYear}</Text>
                        </View>
                        <View style={styles.docMetaRow}>
                          <Text style={styles.docMetaLabel}>{t('quarter')}: </Text>
                          <Text style={styles.docMetaValue}>{item.quarter}</Text>
                        </View>
                        <Text style={styles.docDate}>
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                        </Text>
                      </View>
                      
                      <View style={styles.docCardRight}>
                        <View style={styles.downloadIconCircle}>
                          <Ionicons name="download-outline" size={20} color={colors.white} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      );
    }

    if (activeSubScreen === 'gallery') {
      return (
        <View style={styles.container}>
          <ScreenHeader title={t('gallery')} onBack={handleBack} />
          {galleryLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.goldDark} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.galleryScroll} showsVerticalScrollIndicator={false}>
              <TouchableOpacity 
                style={styles.uploadCard} 
                onPress={handleUploadGallery} 
                disabled={uploadLoading}
                activeOpacity={0.8}
              >
                {uploadLoading ? (
                  <View style={styles.uploadLoadingRow}>
                    <ActivityIndicator size="small" color={colors.goldDark} style={{ marginRight: 8 }} />
                    <Text style={styles.uploadCardText}>
                      {globalLang === 'hi' ? 'अपलोड हो रहा है...' : 'Uploading...'}
                    </Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={28} color={colors.goldDark} style={{ marginBottom: 4 }} />
                    <Text style={styles.uploadCardText}>
                      {globalLang === 'hi' ? 'नया चित्र अपलोड करें' : 'Upload New Photo'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {galleryList.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="images-outline" size={48} color={colors.textMuted} />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {globalLang === 'hi' ? 'कोई चित्र नहीं मिला' : 'No Images Found'}
                  </Text>
                  <Text style={styles.emptyDescription}>
                    {globalLang === 'hi' ? 'अपनी प्रोफ़ाइल में दिखाने के लिए चित्र अपलोड करें।' : 'Upload photos to feature them on your profile.'}
                  </Text>
                </View>
              ) : (
                <View style={styles.galleryGrid}>
                  {galleryList.map((item) => (
                    <View key={item.id} style={styles.galleryCard}>
                      <TouchableOpacity 
                        style={styles.imageContainer}
                        onPress={() => setSelectedGalleryImage(`${SOCKET_BASE}/${item.image}`)}
                        activeOpacity={0.9}
                      >
                        <Image 
                          source={{ uri: `${SOCKET_BASE}/${item.image}` }} 
                          style={styles.galleryImage}
                          resizeMode="cover"
                        />
                        {item.isActive === 0 && (
                          <View style={styles.hiddenOverlay}>
                            <Ionicons name="eye-off" size={20} color={colors.white} />
                            <Text style={styles.hiddenText}>
                              {globalLang === 'hi' ? 'छिपा हुआ' : 'Hidden'}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                      <View style={styles.galleryCardActions}>
                        <TouchableOpacity 
                          style={[styles.actionBtn, { backgroundColor: colors.surface }]} 
                          onPress={() => handleToggleGallery(item.id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons 
                            name={item.isActive === 1 ? "eye" : "eye-off"} 
                            size={16} 
                            color={item.isActive === 1 ? '#4CAF50' : colors.textSecondary} 
                          />
                          <Text style={[styles.actionBtnText, { color: item.isActive === 1 ? '#4CAF50' : colors.textSecondary }]}>
                            {item.isActive === 1 
                              ? (globalLang === 'hi' ? 'दिखाएं' : 'Show') 
                              : (globalLang === 'hi' ? 'छिपाएं' : 'Hide')}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.actionBtn, { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2' }]} 
                          onPress={() => handleDeleteGallery(item.id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash" size={14} color="#D32F2F" />
                          <Text style={[styles.actionBtnText, { color: '#D32F2F' }]}>
                            {globalLang === 'hi' ? 'हटाएं' : 'Delete'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          )}

          {/* Adjust Photo Modal */}
          <Modal visible={adjustModalVisible} transparent animationType="fade">
            <View style={styles.adjustModalOverlay}>
              <View style={styles.adjustHeader}>
                <TouchableOpacity onPress={() => setAdjustModalVisible(false)} style={styles.adjustCloseBtnHeader}>
                  <Ionicons name="close" size={24} color={colors.white} />
                </TouchableOpacity>
                <Text style={styles.adjustHeaderTitle}>
                  {globalLang === 'hi' ? 'छवि समायोजित करें' : 'Adjust & Crop'}
                </Text>
                <TouchableOpacity 
                  onPress={confirmUploadGallery} 
                  disabled={uploadLoading}
                  style={[styles.adjustProceedBtnHeader, { backgroundColor: uploadLoading ? 'rgba(76,175,80,0.4)' : '#2E7D32' }]}
                >
                  {uploadLoading ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Ionicons name="checkmark" size={22} color={colors.white} />
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.adjustHelperText}>
                {globalLang === 'hi' ? 'खींचकर स्थान बदलें • ज़ूम करने के लिए बटनों का उपयोग करें' : 'Drag to reposition • Use buttons below to zoom'}
              </Text>

              <View style={styles.adjustImageContainer}>
                {tempImageUri && (
                  <View style={styles.cropBox} {...panResponder.panHandlers}>
                    <Image 
                      source={{ uri: tempImageUri }} 
                      style={[
                        styles.adjustImage,
                        {
                          transform: [
                            { scale: scale },
                            { translateX: translateX },
                            { translateY: translateY },
                            { rotate: `${rotation}deg` }
                          ]
                        }
                      ]} 
                      resizeMode="cover"
                    />
                    {/* Visual guidelines grid overlay */}
                    <View style={styles.gridOverlay} pointerEvents="none">
                      <View style={styles.gridRow}>
                        <View style={styles.gridCell} />
                        <View style={styles.gridCell} />
                        <View style={styles.gridCell} />
                      </View>
                      <View style={styles.gridRow}>
                        <View style={styles.gridCell} />
                        <View style={styles.gridCell} />
                        <View style={styles.gridCell} />
                      </View>
                      <View style={styles.gridRow}>
                        <View style={styles.gridCell} />
                        <View style={styles.gridCell} />
                        <View style={styles.gridCell} />
                      </View>
                    </View>
                  </View>
                )}
              </View>

              {/* Adjust Controls Panel */}
              <View style={styles.adjustControlsRow}>
                <TouchableOpacity 
                  style={styles.adjustControlBtn} 
                  onPress={() => setScale(prev => Math.max(1.0, prev - 0.1))}
                  activeOpacity={0.7}
                >
                  <Ionicons name="remove-circle-outline" size={24} color={colors.white} />
                </TouchableOpacity>
                
                <Text style={styles.adjustControlText}>
                  {Math.round(scale * 100)}%
                </Text>

                <TouchableOpacity 
                  style={styles.adjustControlBtn} 
                  onPress={() => setScale(prev => Math.min(3.0, prev + 0.1))}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle-outline" size={24} color={colors.white} />
                </TouchableOpacity>

                <View style={{ width: 1, height: 20, backgroundColor: '#334155', marginHorizontal: 8 }} />

                <TouchableOpacity 
                  style={styles.adjustControlBtnRow} 
                  onPress={() => setRotation(prev => (prev + 90) % 360)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="reload-outline" size={18} color={colors.white} style={{ marginRight: 4 }} />
                  <Text style={styles.adjustControlBtnText}>
                    {globalLang === 'hi' ? 'घुमाएं' : 'Rotate'}
                  </Text>
                </TouchableOpacity>

                <View style={{ width: 1, height: 20, backgroundColor: '#334155', marginHorizontal: 8 }} />

                <TouchableOpacity 
                  style={styles.adjustControlBtnRow} 
                  onPress={resetAdjustmentStates}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh-outline" size={16} color={colors.white} style={{ marginRight: 4 }} />
                  <Text style={styles.adjustControlBtnText}>
                    {globalLang === 'hi' ? 'रीसेट' : 'Reset'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.adjustFooter}>
                <TouchableOpacity 
                  style={[styles.adjustFooterBtn, { backgroundColor: '#334155' }]} 
                  onPress={() => setAdjustModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle-outline" size={20} color={colors.white} style={{ marginRight: 6 }} />
                  <Text style={[styles.adjustFooterBtnText, { color: colors.white }]}>
                    {t('cancel') || 'Cancel'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.adjustFooterBtn, { backgroundColor: '#2E7D32' }]} 
                  onPress={confirmUploadGallery}
                  disabled={uploadLoading}
                  activeOpacity={0.7}
                >
                  {uploadLoading ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color={colors.white} style={{ marginRight: 6 }} />
                      <Text style={[styles.adjustFooterBtnText, { color: colors.white }]}>
                        {globalLang === 'hi' ? 'आगे बढ़ें' : 'Proceed'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Fullscreen Image Preview Modal */}
          <Modal 
            visible={!!selectedGalleryImage} 
            transparent 
            animationType="fade" 
            onRequestClose={() => setSelectedGalleryImage(null)}
          >
            <View style={styles.previewModalOverlay}>
              <TouchableOpacity style={styles.previewCloseBtn} onPress={() => setSelectedGalleryImage(null)} activeOpacity={0.7}>
                <Ionicons name="close" size={28} color={colors.white} />
              </TouchableOpacity>
              {selectedGalleryImage && (
                <Image 
                  source={{ uri: selectedGalleryImage }} 
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </Modal>
        </View>
      );
    }

    if (activeSubScreen === 'terms') {
      return (
        <View style={styles.container}>
          <ScreenHeader title={t('terms_conditions')} onBack={handleBack} />
          {termsLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.goldDark} />
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              {termsContent ? (
                <WebView
                  originWhitelist={['*']}
                  source={{ html: generateHtmlTemplate(termsContent.description || '') }}
                  style={styles.webView}
                  textZoom={100}
                />
              ) : (
                <View style={styles.centered}>
                  <Text style={{ color: colors.textSecondary }}>{t('no_records_found')}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      );
    }

    if (activeSubScreen === 'training') {
      return (
        <View style={styles.container}>
          <ScreenHeader title={t('training_video')} onBack={handleBack} />
          {videoLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.goldDark} />
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {videoList.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconCircle}>
                      <Ionicons name="play-circle-outline" size={60} color={colors.goldDark} />
                    </View>
                    <Text style={styles.emptyTitle}>{t('no_videos_found')}</Text>
                    <Text style={styles.emptyDesc}>{t('no_videos_desc')}</Text>
                  </View>
                ) : (
                  <View style={styles.videoListContainer}>
                    {videoList.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.videoCard}
                        activeOpacity={0.9}
                        onPress={() => handlePlayVideo(item)}
                      >
                        <View style={styles.videoCoverContainer}>
                          {item.cover_image ? (
                            <Image
                              source={{ uri: getForm16aUrl(item.cover_image) }}
                              style={styles.videoCover}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.videoPlaceholderCover}>
                              <Ionicons name="image-outline" size={48} color={colors.textLight} />
                            </View>
                          )}
                          <View style={styles.playButtonOverlay}>
                            <View style={styles.playIconInner}>
                              <Ionicons name="play" size={28} color={colors.white} style={{ marginLeft: 3 }} />
                            </View>
                          </View>
                        </View>
                        
                        <View style={styles.videoInfoBlock}>
                          <Text style={styles.videoTitle} numberOfLines={2}>
                            {item.title}
                          </Text>
                          <View style={styles.videoMeta}>
                            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
                            <Text style={styles.videoDate}>
                              {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>

              {activeVideo && (
                <Modal
                  visible={!!activeVideo}
                  transparent={true}
                  animationType="fade"
                  onRequestClose={() => setActiveVideo(null)}
                >
                  <View style={styles.modalBg}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalVideoTitle} numberOfLines={1}>
                        {activeVideo.title}
                      </Text>
                      <TouchableOpacity
                        style={styles.modalCloseBtn}
                        onPress={() => setActiveVideo(null)}
                      >
                        <Ionicons name="close" size={24} color={colors.white} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.webViewWrapper}>
                      <WebView
                        style={{ flex: 1 }}
                        javaScriptEnabled={true}
                        allowsFullscreenVideo={true}
                        source={{
                          uri: `https://www.youtube.com/embed/${getYoutubeId(activeVideo.video_link)}?autoplay=1&modestbranding=1&rel=0`
                        }}
                      />
                    </View>
                  </View>
                </Modal>
              )}
            </View>
          )}
        </View>
      );
    }

    if (activeSubScreen === 'billing') {
      return (
        <View style={styles.container}>
          <ScreenHeader title={t('update_billing')} onBack={handleBack} />
          {billingLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.goldDark} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              <View style={styles.formContainer}>
                
                {/* Billing Address Input Field */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>
                    {globalLang === 'hi' ? 'व्यावसायिक बिलिंग पता / जीएसटी पता' : 'Business Billing Address / GST Address'}
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={billingAddress}
                    onChangeText={setBillingAddress}
                    multiline={true}
                    numberOfLines={4}
                    placeholderTextColor={colors.textLight}
                    placeholder={globalLang === 'hi' ? 'अपना व्यावसायिक बिलिंग पता दर्ज करें...' : 'Enter your business billing address...'}
                  />
                </View>

                {/* Submit Action Button */}
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.goldDark }, saveLoading && { opacity: 0.6 }]}
                  onPress={handleUpdateBillingAddress}
                  disabled={saveLoading}
                >
                  {saveLoading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={[styles.saveBtnText, { color: colors.white }]}>
                      {globalLang === 'hi' ? 'सबमिट करें' : 'Submit'}
                    </Text>
                  )}
                </TouchableOpacity>

              </View>
            </ScrollView>
          )}
        </View>
      );
    }

    const sub = SETTING_ITEMS.find(item => item.key === activeSubScreen);
    return (
      <View style={styles.container}>
        <ScreenHeader title={sub.title} onBack={handleBack} />
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: sub.color }]}>
            <Text style={styles.emoji}>{sub.emoji}</Text>
          </View>
          <Text style={styles.subTitle}>{sub.title}</Text>
          <Text style={styles.subDescription}>{sub.desc}</Text>
          <View style={styles.badgePlaceholder}>
            <Text style={styles.badgeText}>
              {globalLang === 'hi' ? 'जल्द ही आ रहा है' : 'Under Development'}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('settings')} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {SETTING_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => setActiveSubScreen(item.key)}
            >
              <View style={[styles.cardIconWrap, { backgroundColor: item.color }]}>
                <Text style={styles.cardEmoji}>{item.emoji}</Text>
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.secondary },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 40 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '47%', // approx half, minus gap spacing
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 130,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    flexGrow: 1,
  },
  cardIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardEmoji: { fontSize: 24 },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 18,
  },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emoji: { fontSize: 48 },
  subTitle: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subDescription: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  badgePlaceholder: {
    marginTop: 12,
    backgroundColor: colors.goldBg,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  badgeText: { fontSize: 12, fontWeight: '800', color: colors.goldDark },

  // Phone Form Styles
  formContainer: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    marginTop: 8,
  },
  field: { marginBottom: 20 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#fb9494', // Astrovell theme red/pink brand color
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#fb9494',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: { color: colors.white, fontSize: 15, fontWeight: '800' },

  // Radio button / selector styles
  radioRow: { flexDirection: 'row', gap: 12 },
  radioBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  radioBtnActive: { borderColor: colors.gold, backgroundColor: colors.goldBg },
  radioText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  radioTextActive: { color: colors.goldDark, fontWeight: '700' },

  // Pending verification alert card
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  pendingText: { fontSize: 13, fontWeight: '800', color: '#B45309' },
  pendingSubText: { fontSize: 11, color: '#D97706', marginTop: 4, fontWeight: '600' },

  // Bank Card Styles
  bankCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  bankCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  bankCardLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  bankCardValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  bankCardNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 2,
    marginVertical: 12,
  },
  bankCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginTop: 16,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailsList: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  
  // Pending verification card additions
  pendingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pendingCardBody: {
    paddingLeft: 28,
  },
  pendingDetailsGrid: {
    marginTop: 4,
    gap: 4,
  },
  pendingDetailItem: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },

  // Form 16A Styles
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.goldBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  docList: {
    gap: 16,
    marginTop: 8,
  },
  docCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  docCardLeft: {
    marginRight: 16,
  },
  pdfIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  pdfBadge: {
    position: 'absolute',
    bottom: 4,
    backgroundColor: '#EF4444',
    color: colors.white,
    fontSize: 8,
    fontWeight: '900',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  docCardMiddle: {
    flex: 1,
    justifyContent: 'center',
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  docMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  docMetaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  docMetaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  docDate: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 4,
  },
  docCardRight: {
    marginLeft: 12,
  },
  downloadIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.goldDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  webView: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  
  // Training Videos Styles
  videoListContainer: {
    gap: 20,
    marginTop: 8,
  },
  videoCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  videoCoverContainer: {
    height: 190,
    width: '100%',
    position: 'relative',
    backgroundColor: '#000',
  },
  videoCover: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholderCover: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  playIconInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(230, 168, 0, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  videoInfoBlock: {
    padding: 16,
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 22,
    marginBottom: 8,
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoDate: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  
  // Modal video player styles
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  modalVideoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
    flex: 1,
    marginRight: 16,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webViewWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  resendBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  resendText: {
    fontSize: 14,
    color: colors.goldDark,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // Gallery Styles
  galleryScroll: {
    padding: 16,
    paddingBottom: 60,
  },
  uploadCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  uploadLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadCardText: {
    fontSize: 14,
    color: colors.goldDark,
    fontWeight: '800',
    marginTop: 4,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  galleryCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  imageContainer: {
    aspectRatio: 1,
    position: 'relative',
    backgroundColor: colors.secondary,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  hiddenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  galleryCardActions: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },

  // Adjust Photo Modal Styles
  adjustModalOverlay: {
    flex: 1,
    backgroundColor: '#0F172A', // Dark slate/black theme
    paddingHorizontal: 20,
    paddingVertical: 30,
    justifyContent: 'space-between',
  },
  adjustHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  adjustHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.white,
  },
  adjustCloseBtnHeader: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustProceedBtnHeader: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustHelperText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  adjustImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  cropBox: {
    width: 300,
    height: 300,
    backgroundColor: '#020617',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 3,
    borderColor: '#FFCC00', // Solid gold border for strong contrast on any background
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  adjustImage: {
    width: '100%',
    height: '100%',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridCell: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 204, 0, 0.40)', // Golden grid lines for high contrast on black/white
  },
  adjustControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    marginVertical: 16,
    gap: 8,
  },
  adjustControlBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustControlBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
  },
  adjustControlText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
    minWidth: 44,
    textAlign: 'center',
  },
  adjustControlBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  adjustFooter: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  adjustFooterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  adjustFooterBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
  // Fullscreen Preview Modal Styles
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.95)', // Semi-transparent deep dark background
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCloseBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
});

export default SettingsScreen;
