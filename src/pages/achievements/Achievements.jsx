import { useState, useEffect } from 'react';
import { Award, Plus, Trophy, Medal, Star, Users, User, BookOpen, Tag, FileText } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../../components/ui/Modal';

export default function Achievements() {
  const { t } = useLanguage();
  const { showSuccess } = useToast();
  const [achievements, setAchievements] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    // Mock data
    const mockAchievements = [
      {
        id: 1,
        student: 'សិស្សស្រីគំរូ',
        studentId: 'STU004',
        achievement: 'ឧត្តមភាពសិក្សា',
        category: 'សិក្សា',
        date: '2024-01-15',
        description: 'សមិទ្ធិផលពិសេសក្នុងគណិតវិទ្យា',
        level: 'មាស'
      },
      {
        id: 2,
        student: 'សិស្សប្រុសគំរូ',
        studentId: 'STU003',
        achievement: 'ជើងឯកកីឡា',
        category: 'កីឡា',
        date: '2024-01-10',
        description: 'ជះជ្រយក្នុងការប្រកួតកីឡាអន្តរសាលារៀន',
        level: 'ប្រាក់'
      }
    ];
    setAchievements(mockAchievements);
  };

  const handleAddAchievement = async (formData) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newAchievement = {
        id: Date.now(),
        ...formData,
        date: new Date().toISOString().split('T')[0]
      };
      setAchievements(prev => [newAchievement, ...prev]);
      showSuccess(t('Achievement added successfully', 'Achievement added successfully'));
      setShowAddModal(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('studentAchievements') || 'Student Achievements'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {t('trackAchievements') || 'Track and celebrate student achievements'}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('addAchievement') || 'Add Achievement'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Trophy className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Awards</p>
              <p className="text-2xl font-bold text-gray-900">{achievements.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Medal className="h-8 w-8 text-gray-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">5</p>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {achievements.map((achievement) => (
          <div key={achievement.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Award className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">{achievement.achievement}</h3>
                  <p className="text-sm text-gray-600">{achievement.student} ({achievement.studentId})</p>
                </div>
              </div>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                {achievement.category}
              </span>
            </div>
            <p className="mt-4 text-sm text-gray-600">{achievement.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-gray-500">{new Date(achievement.date).toLocaleDateString()}</span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                achievement.level === 'Gold' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {achievement.level}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Achievement Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t('addAchievement')}
        size="lg"
        stickyFooter={true}
        footer={
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" form="add-achievement-form" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
              {loading ? t('adding') : t('addAchievement')}
            </button>
          </div>
        }
      >
        <form id="add-achievement-form" onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          handleAddAchievement(Object.fromEntries(formData));
        }}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <input 
                  name="student" 
                  type="text" 
                  required 
                  className="w-full pl-10 border border-gray-300 rounded-lg px-3 py-2 transition-all duration-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md" 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Achievement</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Award className="h-4 w-4 text-gray-400" />
                </div>
                <input 
                  name="achievement" 
                  type="text" 
                  required 
                  className="w-full pl-10 border border-gray-300 rounded-lg px-3 py-2 transition-all duration-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md" 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Tag className="h-4 w-4 text-gray-400" />
                </div>
                <select 
                  name="category" 
                  required 
                  className="w-full pl-10 border border-gray-300 rounded-lg px-3 py-2 transition-all duration-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md"
                >
                  <option value="">Select Category</option>
                  <option value="Academic">{t('academic')}</option>
                  <option value="Sports">{t('sports')}</option>
                  <option value="Arts">{t('arts')}</option>
                  <option value="Leadership">{t('leadership')}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <div className="relative">
                <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
                  <FileText className="h-4 w-4 text-gray-400" />
                </div>
                <textarea 
                  name="description" 
                  className="w-full pl-10 border border-gray-300 rounded-lg px-3 py-2 transition-all duration-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md" 
                  rows="3"
                ></textarea>
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}