import { X, User, Mail, Phone, Users, Home, Briefcase, AlertCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import { useLanguage } from '../../contexts/LanguageContext';
import Badge from '../ui/Badge';

export default function ParentViewModal({ isOpen, onClose, parent }) {
  const { t } = useLanguage();

  if (!parent) return null;

  const relationshipLabels = {
    FATHER: t('father', 'Father'),
    MOTHER: t('mother', 'Mother'),
    GUARDIAN: t('guardian', 'Guardian'),
    OTHER: t('other', 'Other')
  };

  const relationshipColors = {
    FATHER: 'blue',
    MOTHER: 'pink',
    GUARDIAN: 'green',
    OTHER: 'gray'
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('parentDetails', 'Parent Details')}
      size="lg"
    >
      <div className="space-y-6">
        {/* Header with Avatar */}
        <div className="flex items-center space-x-4 pb-6 border-b">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {(parent.firstName?.[0] || parent.fullname?.[0] || 'P').toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">
              {parent.fullname || `${parent.firstName || ''} ${parent.lastName || ''}`.trim() || t('unnamed', 'Unnamed')}
            </h2>
            <div className="mt-1">
              <Badge
                color={relationshipColors[parent.relationship] || 'gray'}
                variant="solid"
                size="md"
              >
                {relationshipLabels[parent.relationship] || parent.relationship}
              </Badge>
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <User className="h-5 w-5 mr-2 text-purple-600" />
            {t('basicInformation', 'Basic Information')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem
              icon={User}
              label={t('firstName', 'First Name')}
              value={parent.firstName}
            />
            <InfoItem
              icon={User}
              label={t('lastName', 'Last Name')}
              value={parent.lastName}
            />
          </div>

          {parent.fullname && (
            <InfoItem
              icon={User}
              label={t('fullName', 'Full Name')}
              value={parent.fullname}
            />
          )}
        </div>

        {/* Contact Information */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Phone className="h-5 w-5 mr-2 text-purple-600" />
            {t('contactInformation', 'Contact Information')}
          </h3>

          <div className="space-y-3">
            {parent.email && (
              <InfoItem
                icon={Mail}
                label={t('email', 'Email')}
                value={parent.email}
                link={`mailto:${parent.email}`}
              />
            )}
            {parent.phone && (
              <InfoItem
                icon={Phone}
                label={t('phone', 'Phone Number')}
                value={parent.phone}
                link={`tel:${parent.phone}`}
              />
            )}
            {parent.emergencyContact && (
              <InfoItem
                icon={AlertCircle}
                label={t('emergencyContact', 'Emergency Contact')}
                value={parent.emergencyContact}
                link={`tel:${parent.emergencyContact}`}
              />
            )}
          </div>
        </div>

        {/* Additional Information */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Home className="h-5 w-5 mr-2 text-purple-600" />
            {t('additionalInformation', 'Additional Information')}
          </h3>

          <div className="space-y-3">
            {parent.occupation && (
              <InfoItem
                icon={Briefcase}
                label={t('occupation', 'Occupation')}
                value={parent.occupation}
              />
            )}
            {parent.address && (
              <InfoItem
                icon={Home}
                label={t('address', 'Address')}
                value={parent.address}
                multiline
              />
            )}
            {parent.notes && (
              <InfoItem
                icon={AlertCircle}
                label={t('notes', 'Notes')}
                value={parent.notes}
                multiline
              />
            )}
          </div>
        </div>

        {/* Students */}
        {parent.students && parent.students.length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Users className="h-5 w-5 mr-2 text-purple-600" />
              {t('students', 'Students')} ({parent.students.length})
            </h3>

            <div className="grid grid-cols-1 gap-3">
              {parent.students.map((student, index) => (
                <div
                  key={student.id || index}
                  className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-semibold">
                    {(student.firstName?.[0] || student.fullname?.[0] || 'S').toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {student.fullname || `${student.firstName || ''} ${student.lastName || ''}`.trim()}
                    </div>
                    {student.className && (
                      <div className="text-sm text-gray-500">
                        {t('class', 'Class')}: {student.className}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex items-center justify-end pt-6 border-t">
          <Button onClick={onClose} variant="primary">
            <X className="h-4 w-4 mr-2" />
            {t('close', 'Close')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// Helper component for info items
function InfoItem({ icon: Icon, label, value, link, multiline = false }) {
  const content = (
    <div className="flex items-start space-x-3">
      <Icon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-500">{label}</div>
        <div className={`text-sm text-gray-900 ${multiline ? 'whitespace-pre-wrap' : ''} ${link ? 'hover:text-purple-600 hover:underline' : ''}`}>
          {value || '-'}
        </div>
      </div>
    </div>
  );

  if (link) {
    return (
      <a href={link} className="block">
        {content}
      </a>
    );
  }

  return <div>{content}</div>;
}
