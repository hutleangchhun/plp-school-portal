import { useState, useEffect } from 'react';
import { X, Save, User, Mail, Phone, Users, Home } from 'lucide-react';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import * as RadioGroup from '@radix-ui/react-radio-group';

export default function ParentEditModal({ isOpen, onClose, onSave, parent }) {
  const { t } = useLanguage();
  const { showError } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    fullname: '',
    email: '',
    phone: '',
    relationship: 'FATHER',
    occupation: '',
    address: '',
    emergencyContact: '',
    notes: ''
  });

  // Populate form when editing
  useEffect(() => {
    if (parent) {
      setFormData({
        firstName: parent.firstName || '',
        lastName: parent.lastName || '',
        fullname: parent.fullname || '',
        email: parent.email || '',
        phone: parent.phone || '',
        relationship: parent.relationship || 'FATHER',
        occupation: parent.occupation || '',
        address: parent.address || '',
        emergencyContact: parent.emergencyContact || '',
        notes: parent.notes || ''
      });
    } else {
      // Reset form for new parent
      setFormData({
        firstName: '',
        lastName: '',
        fullname: '',
        email: '',
        phone: '',
        relationship: 'FATHER',
        occupation: '',
        address: '',
        emergencyContact: '',
        notes: ''
      });
    }
  }, [parent]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.firstName?.trim() && !formData.fullname?.trim()) {
      showError(t('firstNameRequired', 'First name or full name is required'));
      return false;
    }
    if (!formData.lastName?.trim() && !formData.fullname?.trim()) {
      showError(t('lastNameRequired', 'Last name or full name is required'));
      return false;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      showError(t('validEmailRequired', 'Please enter a valid email address'));
      return false;
    }
    if (!formData.phone?.trim()) {
      showError(t('phoneRequired', 'Phone number is required'));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // If fullname is provided, use it; otherwise construct from firstName and lastName
      const dataToSave = {
        ...formData,
        fullname: formData.fullname || `${formData.firstName} ${formData.lastName}`.trim()
      };

      await onSave(dataToSave);
      onClose();
    } catch (error) {
      console.error('Error saving parent:', error);
      showError(error.message || t('failedToSaveParent', 'Failed to save parent'));
    } finally {
      setLoading(false);
    }
  };

  const relationshipOptions = [
    { value: 'FATHER', label: t('father', 'Father') },
    { value: 'MOTHER', label: t('mother', 'Mother') },
    { value: 'GUARDIAN', label: t('guardian', 'Guardian') },
    { value: 'OTHER', label: t('other', 'Other') }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={parent ? t('editParent', 'Edit Parent') : t('addParent', 'Add Parent')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <User className="h-5 w-5 mr-2 text-purple-600" />
            {t('basicInformation', 'Basic Information')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                {t('firstName', 'First Name')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder={t('enterFirstName', 'Enter first name')}
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                {t('lastName', 'Last Name')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder={t('enterLastName', 'Enter last name')}
              />
            </div>
          </div>

          <div>
            <label htmlFor="fullname" className="block text-sm font-medium text-gray-700 mb-1">
              {t('fullName', 'Full Name')} {t('optional', '(Optional)')}
            </label>
            <input
              type="text"
              id="fullname"
              name="fullname"
              value={formData.fullname}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder={t('enterFullName', 'Enter full name')}
            />
            <p className="mt-1 text-xs text-gray-500">
              {t('fullNameHelp', 'Leave empty to auto-generate from first and last name')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('relationship', 'Relationship')} <span className="text-red-500">*</span>
            </label>
            <RadioGroup.Root
              value={formData.relationship}
              onValueChange={(value) => setFormData(prev => ({ ...prev, relationship: value }))}
              className="flex flex-wrap gap-3"
            >
              {relationshipOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroup.Item
                    value={option.value}
                    id={`relationship-${option.value}`}
                    className="w-4 h-4 rounded-full border border-gray-300 data-[state=checked]:border-purple-600 data-[state=checked]:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  >
                    <RadioGroup.Indicator className="flex items-center justify-center w-full h-full relative after:content-[''] after:w-2 after:h-2 after:rounded-full after:bg-white" />
                  </RadioGroup.Item>
                  <label htmlFor={`relationship-${option.value}`} className="text-sm text-gray-700 cursor-pointer">
                    {option.label}
                  </label>
                </div>
              ))}
            </RadioGroup.Root>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Phone className="h-5 w-5 mr-2 text-purple-600" />
            {t('contactInformation', 'Contact Information')}
          </h3>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              <Mail className="h-4 w-4 inline mr-1" />
              {t('email', 'Email')}
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder={t('enterEmail', 'Enter email address')}
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              <Phone className="h-4 w-4 inline mr-1" />
              {t('phone', 'Phone Number')} <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder={t('enterPhone', 'Enter phone number')}
              required
            />
          </div>

          <div>
            <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700 mb-1">
              {t('emergencyContact', 'Emergency Contact')}
            </label>
            <input
              type="tel"
              id="emergencyContact"
              name="emergencyContact"
              value={formData.emergencyContact}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder={t('enterEmergencyContact', 'Enter emergency contact number')}
            />
          </div>
        </div>

        {/* Additional Information */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Home className="h-5 w-5 mr-2 text-purple-600" />
            {t('additionalInformation', 'Additional Information')}
          </h3>

          <div>
            <label htmlFor="occupation" className="block text-sm font-medium text-gray-700 mb-1">
              {t('occupation', 'Occupation')}
            </label>
            <input
              type="text"
              id="occupation"
              name="occupation"
              value={formData.occupation}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder={t('enterOccupation', 'Enter occupation')}
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              {t('address', 'Address')}
            </label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder={t('enterAddress', 'Enter address')}
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              {t('notes', 'Notes')}
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder={t('enterNotes', 'Enter any additional notes')}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-6 border-t">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            disabled={loading}
          >
            <X className="h-4 w-4 mr-2" />
            {t('cancel', 'Cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? t('saving', 'Saving...') : t('save', 'Save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
