import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Star, 
  CheckCircle2, 
  AlertTriangle, 
  Droplets, 
  Wind, 
  Sparkles, 
  Send, 
  ShieldCheck, 
  Fuel, 
  Smile, 
  Meh, 
  Frown, 
  Phone, 
  HelpCircle, 
  Lightbulb, 
  Check, 
  Globe,
  ThumbsUp
} from 'lucide-react';
import confetti from 'canvas-confetti';
import api from '../services/api';

// Complete dictionary for Marathi, Hindi, English
const translations = {
  mr: {
    langName: 'मराठी',
    subHeader: 'Smart Eco-Toilet',
    question: 'येथील स्वच्छता कशी वाटली?',
    subQuestion: 'आपला स्वच्छता अनुभव १ ते ५ स्टार्स मध्ये रेट करा',
    ratings: {
      1: 'खूप खराब (Very Poor)',
      2: 'असमाधानकारक (Poor)',
      3: 'साधारण (Average)',
      4: 'छान (Good)',
      5: 'अत्यंत स्वच्छ (Excellent)'
    },
    optionsTitle: 'स्वच्छता अनुभव (Overall Cleanliness Experience)',
    cleanlinessOptions: [
      { id: 'excellent', label: 'उत्कृष्ट (Excellent)', value: 'Excellent', emoji: '🤩', color: '#10b981', stars: 5 },
      { id: 'good', label: 'छान (Good)', value: 'Good', emoji: '😊', color: '#3b82f6', stars: 4 },
      { id: 'average', label: 'साधारण (Average)', value: 'Average', emoji: '😐', color: '#f59e0b', stars: 3 },
      { id: 'bad', label: 'खराब (Bad)', value: 'Bad', emoji: '😡', color: '#ef4444', stars: 1 }
    ],
    whyLow: '⚠️ कमी रेटिंग का दिली? समस्या निवडा:',
    whyAvg: 'सुधारणेसाठी कारणे निवडा:',
    whyHigh: '✨ काय सर्वात जास्त आवडले?',
    negativeReasons: [
      { id: 'odour', label: 'दुर्गंधी येत होती (Bad Odour)', icon: Wind },
      { id: 'water', label: 'पाणी कमी / नव्हते (No / Low Water)', icon: Droplets },
      { id: 'dirty', label: 'फ्लोअर अस्वच्छ होते (Dirty Floor)', icon: AlertTriangle },
      { id: 'soap', label: 'साबण / हँडवॉश नव्हता (No Soap)', icon: Sparkles },
      { id: 'light', label: 'लाईट बंद होती (No Light)', icon: Lightbulb },
      { id: 'door', label: 'दरवाजा / लॉक खराब (Broken Door)', icon: HelpCircle }
    ],
    averageReasons: [
      { id: 'avg_clean', label: 'साधारण स्वच्छता', icon: Sparkles },
      { id: 'avg_water', label: 'पाणी थोडे कमी होते', icon: Droplets },
      { id: 'improve', label: 'आणखी स्वच्छतेची गरज', icon: AlertTriangle }
    ],
    positiveReasons: [
      { id: 'clean', label: 'अत्यंत स्वच्छ व चकाचक', icon: Sparkles },
      { id: 'water_good', label: 'मुबलक पाणी उपलब्ध', icon: Droplets },
      { id: 'smell_good', label: 'सुवासिक वातावरण', icon: Wind },
      { id: 'soap_good', label: 'हँडवॉश उपलब्ध', icon: Check }
    ],
    phoneLabel: 'मोबाईल नंबर (ऐच्छिक - समस्या निवारणासाठी)',
    phonePlaceholder: 'उदा. 9876543210 (Optional)',
    submitBtn: 'फीडबॅक सबमिट करा (Submit Feedback)',
    submitting: 'सबमिट होत आहे...',
    errorRating: 'कृपया १ ते ५ स्टार्स किंवा वरील पर्यायांपैकी एक निवडा.',
    errorSubmit: 'फीडबॅक सबमिट करताना एरर आली. कृपया पुन्हा प्रयत्न करा.',
    thankYouTitle: 'धन्यवाद! Thank You!',
    thankYouMsg: 'आपला मौल्यवान अभिप्राय यशस्वीरित्या नोंदवला गेला आहे. स्वच्छता व आरोग्य राखण्यासाठी आपल्या अभिप्रायाची त्वरित दखल घेतली जाईल.',
    submitAnother: 'नवीन फीडबॅक द्या (Submit Another)',
    footer: 'Powered by Arya Innovtech Pvt Ltd • IoT Smart Sanitation Monitoring'
  },
  hi: {
    langName: 'हिंदी',
    subHeader: 'स्मार्ट इको-टॉयलेट',
    question: 'यहां की स्वच्छता कैसी लगी?',
    subQuestion: 'अपना स्वच्छता अनुभव १ से ५ स्टार्स में रेट करें',
    ratings: {
      1: 'बहुत खराब (Very Poor)',
      2: 'असंतोषजनक (Poor)',
      3: 'औसत / ठीक (Average)',
      4: 'अच्छा (Good)',
      5: 'बहुत साफ और उत्कृष्ट (Excellent)'
    },
    optionsTitle: 'स्वच्छता अनुभव (Overall Cleanliness Experience)',
    cleanlinessOptions: [
      { id: 'excellent', label: 'उत्कृष्ट (Excellent)', value: 'Excellent', emoji: '🤩', color: '#10b981', stars: 5 },
      { id: 'good', label: 'अच्छा (Good)', value: 'Good', emoji: '😊', color: '#3b82f6', stars: 4 },
      { id: 'average', label: 'औसत (Average)', value: 'Average', emoji: '😐', color: '#f59e0b', stars: 3 },
      { id: 'bad', label: 'खराब (Bad)', value: 'Bad', emoji: '😡', color: '#ef4444', stars: 1 }
    ],
    whyLow: '⚠️ कम रेटिंग क्यों दी? समस्या चुनें:',
    whyAvg: 'सुधार के लिए कारण चुनें:',
    whyHigh: '✨ आपको क्या सबसे अच्छा लगा?',
    negativeReasons: [
      { id: 'odour', label: 'बदबू आ रही थी (Bad Odour)', icon: Wind },
      { id: 'water', label: 'पानी कम / नहीं था (No / Low Water)', icon: Droplets },
      { id: 'dirty', label: 'फर्श गंदा था (Dirty Floor)', icon: AlertTriangle },
      { id: 'soap', label: 'साबुन / हैंडवॉश नहीं था (No Soap)', icon: Sparkles },
      { id: 'light', label: 'लाइट बंद / अंधेरा था (No Light)', icon: Lightbulb },
      { id: 'door', label: 'दरवाजा / लॉक खराब था (Broken Door)', icon: HelpCircle }
    ],
    averageReasons: [
      { id: 'avg_clean', label: 'सामान्य सफाई', icon: Sparkles },
      { id: 'avg_water', label: 'पानी थोड़ा कम था', icon: Droplets },
      { id: 'improve', label: 'और सफाई की आवश्यकता', icon: AlertTriangle }
    ],
    positiveReasons: [
      { id: 'clean', label: 'बहुत साफ और चमकदार', icon: Sparkles },
      { id: 'water_good', label: 'भरपूर पानी उपलब्ध', icon: Droplets },
      { id: 'smell_good', label: 'ताजा और खुशबूदार माहौल', icon: Wind },
      { id: 'soap_good', label: 'हैंडवॉश उपलब्ध था', icon: Check }
    ],
    phoneLabel: 'मोबाइल नंबर (वैकल्पिक - समस्या समाधान हेतु)',
    phonePlaceholder: 'उदा. 9876543210 (Optional)',
    submitBtn: 'प्रतिक्रिया सबमिट करें (Submit Feedback)',
    submitting: 'सबमिट हो रहा है...',
    errorRating: 'कृपया १ से ५ स्टार्स या ऊपर दिए विकल्पों में से चुनें।',
    errorSubmit: 'फीडबैक सबमिट करने में समस्या आई। कृपया पुनः प्रयास करें।',
    thankYouTitle: 'धन्यवाद! Thank You!',
    thankYouMsg: 'आपकी बहुमूल्य प्रतिक्रिया सफलतापूर्वक दर्ज कर ली गई है। स्वच्छता और स्वास्थ्य बनाए रखने के लिए इस पर तुरंत कार्रवाई की जाएगी।',
    submitAnother: 'नया फीडबैक दें (Submit Another)',
    footer: 'Powered by Arya Innovtech Pvt Ltd • IoT Smart Sanitation Monitoring'
  },
  en: {
    langName: 'English',
    subHeader: 'Smart Eco-Toilet',
    question: 'How was your hygiene experience?',
    subQuestion: 'Rate cleanliness from 1 to 5 Stars',
    ratings: {
      1: 'Very Poor',
      2: 'Poor',
      3: 'Average',
      4: 'Good',
      5: 'Sparkling Clean & Excellent'
    },
    optionsTitle: 'Overall Cleanliness Experience',
    cleanlinessOptions: [
      { id: 'excellent', label: 'Excellent', value: 'Excellent', emoji: '🤩', color: '#10b981', stars: 5 },
      { id: 'good', label: 'Good', value: 'Good', emoji: '😊', color: '#3b82f6', stars: 4 },
      { id: 'average', label: 'Average', value: 'Average', emoji: '😐', color: '#f59e0b', stars: 3 },
      { id: 'bad', label: 'Bad', value: 'Bad', emoji: '😡', color: '#ef4444', stars: 1 }
    ],
    whyLow: '⚠️ Why the low rating? Select issues:',
    whyAvg: 'What needs improvement?',
    whyHigh: '✨ What did you like the most?',
    negativeReasons: [
      { id: 'odour', label: 'Bad Odour / Smell', icon: Wind },
      { id: 'water', label: 'No / Low Water Supply', icon: Droplets },
      { id: 'dirty', label: 'Dirty Floor / Stains', icon: AlertTriangle },
      { id: 'soap', label: 'No Handwash / Soap', icon: Sparkles },
      { id: 'light', label: 'No Electricity / Dark', icon: Lightbulb },
      { id: 'door', label: 'Broken Door / Latch', icon: HelpCircle }
    ],
    averageReasons: [
      { id: 'avg_clean', label: 'Average Cleanliness', icon: Sparkles },
      { id: 'avg_water', label: 'Water was Low', icon: Droplets },
      { id: 'improve', label: 'Needs Better Cleaning', icon: AlertTriangle }
    ],
    positiveReasons: [
      { id: 'clean', label: 'Sparkling Clean & Sanitized', icon: Sparkles },
      { id: 'water_good', label: 'Abundant Water Supply', icon: Droplets },
      { id: 'smell_good', label: 'Pleasant & Fresh Fragrance', icon: Wind },
      { id: 'soap_good', label: 'Soap & Handwash Available', icon: Check }
    ],
    phoneLabel: 'Mobile Number (Optional - for issue resolution)',
    phonePlaceholder: 'e.g. 9876543210 (Optional)',
    submitBtn: 'Submit Feedback',
    submitting: 'Submitting...',
    errorRating: 'Please select a rating or one of the options above.',
    errorSubmit: 'Error submitting feedback. Please try again.',
    thankYouTitle: 'Thank You!',
    thankYouMsg: 'Your valuable feedback has been recorded successfully. Our team will review this to maintain high hygiene standards.',
    submitAnother: 'Submit Another Feedback',
    footer: 'Powered by Arya Innovtech Pvt Ltd • IoT Smart Sanitation Monitoring'
  }
};

const PublicFeedback = () => {
  const { machineId: paramMachineId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const machineId = paramMachineId || searchParams.get('machine') || searchParams.get('id') || 'SBP2T501';

  // Language state: 'en' (default), 'mr', or 'hi'
  const [language, setLanguage] = useState(() => {
    const urlLang = searchParams.get('lang');
    if (urlLang && translations[urlLang]) return urlLang;
    return 'en';
  });

  const t = translations[language] || translations.en;

  const [machineData, setMachineData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null); // 'excellent' | 'good' | 'average' | 'bad'
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [comment, setComment] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch machine details for display
  useEffect(() => {
    const fetchMachine = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/feedback/machine/${machineId}`);
        if (res.data?.data) {
          setMachineData(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching machine details:', err);
        setMachineData({
          name: machineId,
          ro_name: 'Retail Outlet Petrol Pump',
          omc_name: 'Fuel Station'
        });
      } finally {
        setLoading(false);
      }
    };

    if (machineId) {
      fetchMachine();
    }
  }, [machineId]);

  // When language switches, update selected option label and clear reasons
  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    setSelectedReasons([]);
    const newT = translations[newLang] || translations.en;
    if (selectedOption) {
      const matched = newT.cleanlinessOptions.find(o => o.id === selectedOption);
      if (matched) setComment(matched.label);
    }
  };

  const toggleReason = (label) => {
    if (selectedReasons.includes(label)) {
      setSelectedReasons(selectedReasons.filter(r => r !== label));
    } else {
      setSelectedReasons([...selectedReasons, label]);
    }
  };

  // When user taps a star rating
  const handleRatingSelect = (val) => {
    setRating(val);
    setSelectedReasons([]);
    setErrorMsg('');

    // Automatically align with corresponding option
    if (val === 5) {
      setSelectedOption('excellent');
      setComment(t.cleanlinessOptions.find(o => o.id === 'excellent')?.label || 'Excellent');
    } else if (val === 4) {
      setSelectedOption('good');
      setComment(t.cleanlinessOptions.find(o => o.id === 'good')?.label || 'Good');
    } else if (val === 3) {
      setSelectedOption('average');
      setComment(t.cleanlinessOptions.find(o => o.id === 'average')?.label || 'Average');
    } else {
      setSelectedOption('bad');
      setComment(t.cleanlinessOptions.find(o => o.id === 'bad')?.label || 'Bad');
    }
  };

  // When user clicks direct option: Excellent, Good, Average, Bad
  const handleOptionClick = (opt) => {
    setSelectedOption(opt.id);
    setRating(opt.stars);
    setComment(opt.label);
    setSelectedReasons([]);
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating && !selectedOption) {
      setErrorMsg(t.errorRating);
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const finalComment = comment || (selectedOption ? (t.cleanlinessOptions.find(o => o.id === selectedOption)?.label || selectedOption) : 'General Feedback');

      const payload = {
        machineId,
        machineName: machineData?.name || machineId,
        rating: rating || 5,
        reasons: selectedReasons,
        comment: finalComment,
        userPhone: userPhone.trim() || null,
        language
      };

      await api.post('/feedback/public', payload);

      setSubmitted(true);
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}

    } catch (err) {
      console.error('Error submitting feedback:', err);
      setErrorMsg(t.errorSubmit);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: '#ffffff'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '490px',
        background: 'rgba(30, 41, 59, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(139, 92, 246, 0.15)',
        overflow: 'hidden'
      }}>
        
        {/* Top Header Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(59, 130, 246, 0.3) 100%)',
          padding: '1.25rem 1.25rem 1rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          position: 'relative'
        }}>
          
          {/* Language Switcher Bar at the top */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.85rem'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.12)',
              padding: '0.25rem 0.65rem',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: '600',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}>
              <Fuel size={13} color="#60a5fa" />
              <span>{machineData?.omc_name || 'Petroleum Retail Outlet'}</span>
            </div>

            {/* Language Switcher Pills */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'rgba(15, 23, 42, 0.6)',
              padding: '3px',
              borderRadius: '999px',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              gap: '2px'
            }}>
              <Globe size={13} color="#94a3b8" style={{ marginLeft: '6px', marginRight: '2px' }} />
              {[
                { code: 'en', label: 'English' },
                { code: 'mr', label: 'मराठी' },
                { code: 'hi', label: 'हिंदी' }
              ].map(lang => {
                const isActive = language === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleLanguageChange(lang.code)}
                    style={{
                      background: isActive ? 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)' : 'transparent',
                      color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                      border: 'none',
                      borderRadius: '999px',
                      padding: '0.2rem 0.6rem',
                      fontSize: '0.72rem',
                      fontWeight: isActive ? '800' : '600',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isActive ? '0 2px 8px rgba(139, 92, 246, 0.4)' : 'none'
                    }}
                  >
                    {lang.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <h1 style={{
              margin: '0 0 0.25rem 0',
              fontSize: '1.25rem',
              fontWeight: '800',
              color: '#ffffff',
              letterSpacing: '-0.3px'
            }}>
              {machineData?.ro_name || 'Retail Outlet'}
            </h1>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '0.8rem',
              color: 'rgba(255, 255, 255, 0.7)'
            }}>
              <span style={{
                background: 'rgba(139, 92, 246, 0.25)',
                color: '#c4b5fd',
                padding: '0.15rem 0.5rem',
                borderRadius: '6px',
                fontWeight: '700',
                fontFamily: 'monospace'
              }}>
                ID: {machineId}
              </span>
              <span>• {t.subHeader}</span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ padding: '1.5rem' }}>
          {submitted ? (
            /* Thank You Success Screen */
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.4) 100%)',
                border: '2px solid #10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                boxShadow: '0 0 30px rgba(16, 185, 129, 0.4)'
              }}>
                <CheckCircle2 size={44} color="#10b981" />
              </div>

              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.5rem 0', color: '#ffffff' }}>
                {t.thankYouTitle}
              </h2>

              <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.92rem', lineHeight: 1.6, margin: '0 0 1.5rem 0' }}>
                {t.thankYouMsg}
              </p>

              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '1rem',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '1.5rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <ShieldCheck size={20} color="#10b981" />
                <span style={{ fontSize: '0.85rem', color: '#a7f3d0', fontWeight: '600' }}>
                  Arya Innovtech IoT Smart Sanitation System
                </span>
              </div>

              <div>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setRating(0);
                    setSelectedOption(null);
                    setSelectedReasons([]);
                    setComment('');
                    setUserPhone('');
                  }}
                  style={{
                    padding: '0.75rem 1.75rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s'
                  }}
                >
                  {t.submitAnother}
                </button>
              </div>
            </div>
          ) : (
            /* Feedback Form */
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Question & Star Rating Selector */}
              <div style={{ textAlign: 'center' }}>
                <label style={{
                  display: 'block',
                  fontSize: '1rem',
                  fontWeight: '700',
                  color: '#ffffff',
                  marginBottom: '0.25rem'
                }}>
                  {t.question}
                </label>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.65)' }}>
                  {t.subQuestion}
                </span>

                {/* 5 Big Gold Stars */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '10px',
                  marginTop: '1rem',
                  marginBottom: '0.5rem'
                }}>
                  {[1, 2, 3, 4, 5].map((starVal) => {
                    const isFilled = (hoverRating || rating) >= starVal;
                    return (
                      <button
                        key={starVal}
                        type="button"
                        onClick={() => handleRatingSelect(starVal)}
                        onMouseEnter={() => setHoverRating(starVal)}
                        onMouseLeave={() => setHoverRating(0)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '4px',
                          cursor: 'pointer',
                          transform: isFilled ? 'scale(1.15)' : 'scale(1)',
                          transition: 'transform 0.15s ease, filter 0.15s ease',
                          filter: isFilled ? 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.6))' : 'none'
                        }}
                      >
                        <Star
                          size={42}
                          fill={isFilled ? '#f59e0b' : 'transparent'}
                          color={isFilled ? '#f59e0b' : 'rgba(255, 255, 255, 0.3)'}
                          strokeWidth={1.75}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Rating Label Text */}
                {rating > 0 && (
                  <div style={{
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    marginTop: '0.25rem',
                    color: rating <= 2 ? '#ef4444' : rating === 3 ? '#f59e0b' : '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}>
                    {rating === 1 && <><span>{t.ratings[1]}</span> <Frown size={18} /></>}
                    {rating === 2 && <><span>{t.ratings[2]}</span> <Frown size={18} /></>}
                    {rating === 3 && <><span>{t.ratings[3]}</span> <Meh size={18} /></>}
                    {rating === 4 && <><span>{t.ratings[4]}</span> <Smile size={18} /></>}
                    {rating === 5 && <><span>{t.ratings[5]}</span> <Sparkles size={18} /></>}
                  </div>
                )}
              </div>

              {/* Direct 4 Experience Options: Excellent, Good, Average, Bad (No typing needed) */}
              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  color: 'rgba(255, 255, 255, 0.95)',
                  marginBottom: '0.65rem'
                }}>
                  <Sparkles size={16} color="#8b5cf6" />
                  {t.optionsTitle}
                </label>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '10px'
                }}>
                  {t.cleanlinessOptions.map((opt) => {
                    const isSelected = selectedOption === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleOptionClick(opt)}
                        style={{
                          padding: '0.85rem 0.75rem',
                          borderRadius: '14px',
                          border: isSelected ? `2px solid ${opt.color}` : '1px solid rgba(255, 255, 255, 0.15)',
                          background: isSelected 
                            ? (opt.id === 'excellent' ? 'rgba(16, 185, 129, 0.28)' : opt.id === 'good' ? 'rgba(59, 130, 246, 0.28)' : opt.id === 'average' ? 'rgba(245, 158, 11, 0.28)' : 'rgba(239, 68, 68, 0.28)')
                            : 'rgba(15, 23, 42, 0.55)',
                          color: '#ffffff',
                          fontWeight: '700',
                          fontSize: '0.86rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: isSelected ? `0 0 16px ${opt.color}45` : 'none',
                          transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ fontSize: '1.25rem' }}>{opt.emoji}</span>
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Conditional Reasons Section in Selected Language */}
              {rating > 0 && (
                <div style={{
                  background: rating <= 2 
                    ? 'rgba(239, 68, 68, 0.1)' 
                    : rating === 3 
                      ? 'rgba(245, 158, 11, 0.1)' 
                      : 'rgba(16, 185, 129, 0.1)',
                  border: `1px solid ${
                    rating <= 2 
                      ? 'rgba(239, 68, 68, 0.3)' 
                      : rating === 3 
                        ? 'rgba(245, 158, 11, 0.3)' 
                        : 'rgba(16, 185, 129, 0.3)'
                  }`,
                  borderRadius: '16px',
                  padding: '1rem'
                }}>
                  <div style={{
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    marginBottom: '0.75rem',
                    color: rating <= 2 ? '#fca5a5' : rating === 3 ? '#fde68a' : '#a7f3d0'
                  }}>
                    {rating <= 2 
                      ? t.whyLow 
                      : rating === 3 
                        ? t.whyAvg 
                        : t.whyHigh}
                  </div>

                  {/* Suggestion Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(rating <= 2 ? t.negativeReasons : rating === 3 ? t.averageReasons : t.positiveReasons).map((item) => {
                      const Icon = item.icon;
                      const isSelected = selectedReasons.includes(item.label);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleReason(item.label)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '0.45rem 0.75rem',
                            borderRadius: '10px',
                            fontSize: '0.78rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            border: isSelected 
                              ? (rating <= 2 ? '1px solid #ef4444' : '1px solid #10b981')
                              : '1px solid rgba(255, 255, 255, 0.15)',
                            background: isSelected 
                              ? (rating <= 2 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)')
                              : 'rgba(255, 255, 255, 0.06)',
                            color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.85)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Icon size={14} color={isSelected ? (rating <= 2 ? '#fca5a5' : '#a7f3d0') : '#94a3b8'} />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Optional Phone Number */}
              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.82rem',
                  color: 'rgba(255, 255, 255, 0.75)',
                  marginBottom: '0.4rem'
                }}>
                  <Phone size={14} color="#3b82f6" />
                  {t.phoneLabel}
                </label>
                <input
                  type="tel"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                  placeholder={t.phonePlaceholder}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '0.65rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#fca5a5',
                  fontSize: '0.8rem',
                  textAlign: 'center'
                }}>
                  {errorMsg}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || (!rating && !selectedOption)}
                style={{
                  width: '100%',
                  padding: '0.9rem',
                  borderRadius: '14px',
                  border: 'none',
                  background: (!rating && !selectedOption)
                    ? 'rgba(255, 255, 255, 0.15)' 
                    : 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
                  color: '#ffffff',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: (!rating && !selectedOption) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: (rating || selectedOption) ? '0 10px 25px -5px rgba(139, 92, 246, 0.5)' : 'none',
                  transition: 'all 0.2s ease',
                  opacity: submitting ? 0.7 : 1
                }}
              >
                <Send size={18} />
                {submitting ? t.submitting : t.submitBtn}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '0.85rem 1.25rem',
          textAlign: 'center',
          fontSize: '0.72rem',
          color: 'rgba(255, 255, 255, 0.5)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 0, 0, 0.15)'
        }}>
          {t.footer}
        </div>
      </div>
    </div>
  );
};

export default PublicFeedback;
