import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import StudentRegistrationForm from '../../components/students/StudentRegistrationForm';

const StudentRegistration = () => {
  const { t } = useLanguage();
  const { showSuccess } = useToast();
  const navigate = useNavigate();

  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredUser, setRegisteredUser] = useState(null);

  const handleRegistrationSuccess = (userData) => {
    setRegisteredUser(userData);
    setRegistrationComplete(true);
    showSuccess(t('registrationSuccess', 'Registration completed successfully!'));
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  const handleRegisterAnother = () => {
    setRegistrationComplete(false);
    setRegisteredUser(null);
  };

  if (registrationComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="mx-auto h-20 w-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg mb-6">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('registrationComplete', 'Registration Complete!')}
            </h1>
            <p className="text-gray-600 text-lg">
              {t('registrationSuccessMessage', 'Your student account has been created successfully.')}
            </p>
          </div>

          {/* Success Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {t('welcomeStudent', 'Welcome to the Platform!')}
              </h2>
              <p className="text-gray-600 mb-6">
                {t('registrationSuccessMessage', 'Your student registration has been completed successfully. An account will be created for you by the school administration.')}
              </p>

              {registeredUser && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                  <h3 className="font-medium text-gray-900 mb-2">
                    {t('registrationDetails', 'Registration Details')}
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><span className="font-medium">{t('studentNumber', 'Student Number')}:</span> {registeredUser.student_number || registeredUser.studentNumber}</p>
                    <p><span className="font-medium">{t('fullName', 'Full Name')}:</span> {`${registeredUser.first_name || ''} ${registeredUser.last_name || ''}`.trim()}</p>
                    <p><span className="font-medium">{t('parentName', 'Parent Name')}:</span> {`${registeredUser.parent?.first_name || ''} ${registeredUser.parent?.last_name || ''}`.trim()}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => navigate('/')}
                  variant="primary"
                  className="px-8 py-3 shadow-lg"
                >
                  {t('backToHome', 'Back to Home')}
                </Button>
                <Button
                  onClick={handleRegisterAnother}
                  variant="outline"
                  className="px-8 py-3"
                >
                  {t('registerAnotherStudent', 'Register Another Student')}
                </Button>
              </div>
            </div>
          </div>

          {/* Back to Home */}
          <div className="text-center">
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('backToHome', 'Back to Home')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <StudentRegistrationForm
      onSuccess={handleRegistrationSuccess}
      onCancel={() => navigate('/')}
    />
  );
};

export default StudentRegistration;