import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "../../contexts/ToastContext";
import { useLoading } from "../../contexts/LoadingContext";
import { examScoreTemplateService } from "../../utils/api/services/examScoreTemplateService";
import { subjectService } from "../../utils/api/services/subjectService";
import { subSubjectService } from "../../utils/api/services/subSubjectService";
import { formatClassIdentifier } from "../../utils/helpers";
import { gradeLevelOptions } from "../../utils/formOptions";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PageLoader } from "../../components/ui/DynamicLoader";
import EmptyState from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Dropdown from "../../components/ui/Dropdown";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Badge from "../../components/ui/Badge";
import {
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  FileText,
  Play,
  BookOpen,
  Eye,

  GripVertical,
} from "lucide-react";


/**
 * Sortable Edit Item Component for drag-and-drop in edit modal
 */
function SortableEditItem({ item, index, subjects, subSubjects, onUpdate, onRemove, t }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex gap-2 items-start ${isDragging ? "z-50" : ""
        }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded mt-1.5"
        type="button"
        title={t("dragToReorder", "Drag to reorder")}
      >
        <GripVertical className="w-5 h-5" />
      </button>
      <div className="flex-1">
        <Dropdown
          value={item.subjectId?.toString() || ""}
          onValueChange={(value) => onUpdate(index, "subjectId", parseInt(value))}
          options={[
            { value: "", label: t("selectSubject", "Select Subject") },
            ...subjects.map((subject) => ({
              value: subject.subjectId.toString(),
              label: subject.subjectKhmerName || subject.name,
            })),
          ]}
          placeholder={t("selectSubject", "Select Subject")}
          className="w-full"
        />
      </div>
      <div className="flex-1">
        <Dropdown
          value={item.subSubjectId?.toString() || ""}
          onValueChange={(value) =>
            onUpdate(index, "subSubjectId", value ? parseInt(value) : null)
          }
          options={[
            { value: "", label: t("none", "None (Main Subject)") },
            ...(subSubjects[item.subjectId] || []).map((subSubject) => ({
              value: subSubject.id.toString(),
              label: subSubject.khmerName || subSubject.name,
            })),
          ]}
          placeholder={t("selectSubSubject", "Select Sub-Subject (Optional)")}
          className="w-full"
          disabled={!item.subjectId}
        />
      </div>
      <Button
        onClick={() => onRemove(index)}
        variant="danger"
        size="xs"
        className="mt-1"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}


/**
 * TemplateManagementTab Component
 * Manages exam score templates - create, edit, delete, and apply to classes
 */
export default function TemplateManagementTab({
  user,
  classes,
  selectedClass,
  globalFilterMonth,
  globalFilterYear,
  t,
}) {
  const { showError, showSuccess } = useToast();
  const { startLoading, stopLoading, isLoading } = useLoading();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [subSubjects, setSubSubjects] = useState({});

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: "",
    gradeLevel: "",
    items: [], // Array of { subjectId, subSubjectId? }
  });

  // Apply template form state
  const [applyFormData, setApplyFormData] = useState({
    classId: "",
    month: globalFilterMonth,
    year: parseInt(globalFilterYear),
  });

  /**
   * Fetch all templates for the teacher
   */
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const teacherId = user?.teacher?.id || user?.teacherId;

      if (!teacherId) {
        setLoading(false);
        return;
      }

      const response = await examScoreTemplateService.getTemplates({
        teacherId,
        isActive: true,
      });


      if (response.success) {
        // Transform API response to match expected format
        const transformedTemplates = (response.data || []).map(template => {
          // Convert subjects array to items array
          const items = [];

          if (template.subjects && Array.isArray(template.subjects)) {
            template.subjects.forEach(subjectItem => {
              // Add main subject if it has no sub-subjects
              if (!subjectItem.subSubjects || subjectItem.subSubjects.length === 0) {
                items.push({
                  subjectId: subjectItem.subjectId,
                  subject: subjectItem.subject,
                  subSubjectId: null,
                  subSubject: null,
                  subjectOrder: subjectItem.order || 0,
                  subSubjectOrder: 0,
                });
              } else {
                // Add each sub-subject as a separate item
                subjectItem.subSubjects.forEach(subSubjectItem => {
                  items.push({
                    subjectId: subjectItem.subjectId,
                    subject: subjectItem.subject,
                    subSubjectId: subSubjectItem.subSubjectId,
                    subSubject: subSubjectItem.subSubject,
                    subjectOrder: subjectItem.order || 0,
                    subSubjectOrder: subSubjectItem.order || 0,
                  });
                });
              }
            });
          }

          return {
            ...template,
            items,
          };
        });

        setTemplates(transformedTemplates);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      showError(t("errorFetchingTemplates", "Failed to fetch templates"));
    } finally {
      setLoading(false);
    }
  }, [user, showError, t]);

  /**
   * Fetch all subjects with their grade levels
   */
  const fetchSubjects = useCallback(async () => {
    try {
      const response = await subjectService.getSubjectGrades({ isStudent: true });
      if (response.success) {
        setSubjects(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
      showError(t("errorFetchingSubjects", "Failed to fetch subjects"));
    }
  }, [showError, t]);

  /**
   * Fetch sub-subjects for a specific subject
   */
  const fetchSubSubjects = useCallback(async (subjectId) => {
    try {
      if (!subjectId) return;

      const response = await subSubjectService.getBySubjectId(subjectId);
      if (response.success) {
        setSubSubjects((prev) => ({ ...prev, [subjectId]: response.data || [] }));
      }
    } catch (error) {
      console.error("Error fetching sub-subjects:", error);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchSubjects();
  }, [fetchTemplates, fetchSubjects]);

  /**
   * Handle create template
   */
  const handleCreateTemplate = async () => {
    try {
      if (!formData.name || !formData.gradeLevel || formData.items.length === 0) {
        showError(
          t(
            "fillAllFields",
            "Please fill in all fields and add at least one subject",
          ),
        );
        return;
      }

      startLoading("createTemplate", t("creatingTemplate", "Creating template..."));

      const teacherId = user?.teacher?.id || user?.teacherId;

      // Calculate order for items
      const subjectOrderMap = {};
      const subjectSubOrderMap = {};
      let currentSubjectOrder = 0;

      const itemsWithOrder = formData.items.map((item) => {
        // Determine subject order (based on first occurrence)
        let subjectOrder;
        if (subjectOrderMap.hasOwnProperty(item.subjectId)) {
          subjectOrder = subjectOrderMap[item.subjectId];
        } else {
          subjectOrder = currentSubjectOrder++;
          subjectOrderMap[item.subjectId] = subjectOrder;
        }

        // Determine sub-subject order (sequential within subject)
        let subSubjectOrder = 0;
        if (item.subSubjectId) {
          if (!subjectSubOrderMap[item.subjectId]) {
            subjectSubOrderMap[item.subjectId] = 0;
          }
          subSubjectOrder = subjectSubOrderMap[item.subjectId]++;
        }

        return {
          subjectId: item.subjectId,
          subSubjectId: item.subSubjectId || null,
          subjectOrder: subjectOrder,
          subSubjectOrder: subSubjectOrder,
        };
      });

      const payload = {
        name: formData.name,
        teacherId,
        gradeLevel: formData.gradeLevel,
        items: itemsWithOrder,
      };

      const response = await examScoreTemplateService.createTemplate(payload);

      if (response.success) {
        showSuccess(t("templateCreated", "Template created successfully"));
        setShowCreateModal(false);
        setFormData({ name: "", gradeLevel: "", items: [] });
        fetchTemplates();
      }
    } catch (error) {
      console.error("Error creating template:", error);
      showError(
        error?.response?.data?.message ||
        t("errorCreatingTemplate", "Failed to create template"),
      );
    } finally {
      stopLoading("createTemplate");
    }
  };

  /**
   * Handle update template
   */
  const handleUpdateTemplate = async () => {
    try {
      if (!formData.name || formData.items.length === 0) {
        showError(
          t(
            "fillAllFields",
            "Please fill in all fields and add at least one subject",
          ),
        );
        return;
      }

      startLoading("updateTemplate", t("updatingTemplate", "Updating template..."));

      const subjectOrderMap = {};
      const subjectSubOrderMap = {};
      let currentSubjectOrder = 0;

      const itemsWithOrder = formData.items.map((item) => {
        // Determine subject order (based on first occurrence)
        let subjectOrder;
        if (subjectOrderMap.hasOwnProperty(item.subjectId)) {
          subjectOrder = subjectOrderMap[item.subjectId];
        } else {
          subjectOrder = currentSubjectOrder++;
          subjectOrderMap[item.subjectId] = subjectOrder;
        }

        // Determine sub-subject order (sequential within subject)
        let subSubjectOrder = 0;
        if (item.subSubjectId) {
          if (!subjectSubOrderMap[item.subjectId]) {
            subjectSubOrderMap[item.subjectId] = 0;
          }
          subSubjectOrder = subjectSubOrderMap[item.subjectId]++;
        }

        return {
          subjectId: item.subjectId,
          subSubjectId: item.subSubjectId || null,
          subjectOrder: subjectOrder,
          subSubjectOrder: subSubjectOrder,
        };
      });

      const payload = {
        name: formData.name,
        isActive: true,
        items: itemsWithOrder,
      };

      const response = await examScoreTemplateService.updateTemplate(
        selectedTemplate.id,
        payload,
      );

      if (response.success) {
        showSuccess(t("templateUpdated", "Template updated successfully"));
        setShowEditModal(false);
        setSelectedTemplate(null);
        setFormData({ name: "", gradeLevel: "", items: [] });
        fetchTemplates();
      }
    } catch (error) {
      console.error("Error updating template:", error);
      showError(
        error?.response?.data?.message ||
        t("errorUpdatingTemplate", "Failed to update template"),
      );
    } finally {
      stopLoading("updateTemplate");
    }
  };

  /**
   * Handle delete template
   */
  /**
   * Open delete confirmation dialog
   */
  const handleOpenDeleteConfirm = (template) => {
    setTemplateToDelete(template);
    setShowDeleteConfirm(true);
  };

  /**
   * Delete template after confirmation
   */
  const handleConfirmDelete = async () => {
    try {
      if (!templateToDelete) return;

      startLoading("deleteTemplate", t("deletingTemplate", "Deleting template..."));

      const response = await examScoreTemplateService.deleteTemplate(templateToDelete.id);

      if (response.success) {
        showSuccess(t("templateDeleted", "Template deleted successfully"));
        fetchTemplates();
        setShowDeleteConfirm(false);
        setTemplateToDelete(null);
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      showError(
        error?.response?.data?.message ||
        t("errorDeletingTemplate", "Failed to delete template"),
      );
    } finally {
      stopLoading("deleteTemplate");
    }
  };


  /**
   * Sensors for drag and drop
   */
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /**
   * Handle apply template
   */
  const handleApplyTemplate = async () => {
    try {
      if (!applyFormData.classId || !applyFormData.month || !applyFormData.year) {
        showError(
          t("fillAllFields", "Please fill in all fields"),
        );
        return;
      }

      startLoading("applyTemplate", t("applyingTemplate", "Applying template..."));

      const payload = {
        templateId: selectedTemplate.id,
        classId: parseInt(applyFormData.classId),
        month: applyFormData.month,
        year: applyFormData.year,
      };

      const response = await examScoreTemplateService.applyTemplate(payload);

      if (response.success) {
        const { created, skipped } = response.data;
        showSuccess(
          t(
            "templateAppliedSuccess",
            `Template applied successfully. Created: ${created}, Skipped: ${skipped}`,
          ),
        );
        setShowApplyModal(false);
        setSelectedTemplate(null);
        setApplyFormData({
          classId: "",
          month: globalFilterMonth,
          year: parseInt(globalFilterYear),
        });
      }
    } catch (error) {
      console.error("Error applying template:", error);
      showError(
        error?.response?.data?.message ||
        t("errorApplyingTemplate", "Failed to apply template"),
      );
    } finally {
      stopLoading("applyTemplate");
    }
  };

  /**
   * Add subject/sub-subject item to form
   */
  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          subjectId: "",
          subSubjectId: null,
        },
      ],
    }));
  };

  /**
   * Remove item from form
   */
  const handleRemoveItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  /**
   * Handle drag end for edit modal
   */
  const handleDragEndEdit = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFormData((prev) => {
        const oldIndex = prev.items.findIndex((item) => item.id === active.id);
        const newIndex = prev.items.findIndex((item) => item.id === over.id);
        return {
          ...prev,
          items: arrayMove(prev.items, oldIndex, newIndex),
        };
      });
    }
  };

  /**
   * Update item in form
   */
  const handleUpdateItem = (index, field, value) => {
    setFormData((prev) => {
      const newItems = [...prev.items];

      // If changing subject, fetch sub-subjects and reset subSubjectId
      if (field === "subjectId") {
        newItems[index] = {
          ...newItems[index],
          subjectId: value || null,
          subSubjectId: null,
        };
        if (value) {
          fetchSubSubjects(value);
        }
      } else {
        newItems[index] = {
          ...newItems[index],
          [field]: value || null,
        };
      }

      return { ...prev, items: newItems };
    });
  };

  /**
   * Open edit modal
   */
  const handleOpenEditModal = (template) => {
    setSelectedTemplate(template);
    const items = template.items || [];
    setFormData({
      name: template.name,
      gradeLevel: template.gradeLevel,
      items: items.map((item) => ({
        id: `edit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        subjectId: item.subjectId,
        subSubjectId: item.subSubjectId || null,
      })),
    });

    // Pre-fetch sub-subjects for all subjects in the template
    // Use a Set to avoid duplicate requests for the same subjectId
    const uniqueSubjectIds = new Set();
    items.forEach((item) => {
      if (item.subjectId && !uniqueSubjectIds.has(item.subjectId)) {
        uniqueSubjectIds.add(item.subjectId);
        fetchSubSubjects(item.subjectId);
      }
    });

    setShowEditModal(true);
  };

  /**
   * Open apply modal
   */
  const handleOpenApplyModal = (template) => {
    setSelectedTemplate(template);
    setApplyFormData({
      classId: selectedClass ? selectedClass.toString() : "",
      month: globalFilterMonth,
      year: parseInt(globalFilterYear),
    });
    setShowApplyModal(true);
  };

  if (loading) {
    return <PageLoader message={t("loadingTemplates", "Loading templates...")} />;
  }

  return (
    <div className="mt-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {t("myTemplates", "My Templates")}
        </h2>
        <Button
          onClick={() => {
            setFormData({ name: "", gradeLevel: "", items: [] });
            setShowCreateModal(true);
          }}
          variant="primary"
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t("createTemplate", "Create Template")}
        </Button>
      </div>

      {/* Templates List */}
      {templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t("noTemplates", "No Templates")}
          description={t(
            "noTemplatesDesc",
            "Create your first template to get started",
          )}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  <p className="text-sm text-gray-600">
                    {t("grade", "Grade")} {template.gradeLevel}
                  </p>
                </div>
                <Badge color={template.isActive ? "green" : "gray"} variant="outline">
                  {template.isActive ? t("active", "Active") : t("inactive", "Inactive")}
                </Badge>
              </div>

              {/* Template Items */}
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-2">
                  {t("subjects", "Subjects")} ({template.items?.length || 0})
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={() => handleOpenApplyModal(template)}
                  variant="primary"
                  size="sm"
                  className="gap-2"
                >
                  <Play className="w-4 h-4" />
                  {t("apply", "Apply")}
                </Button>
                <Button
                  onClick={() => {
                    setSelectedTemplate(template);
                    setShowPreviewModal(true);
                  }}
                  variant="secondary"
                  size="sm"
                >
                  <Eye className="w-4 h-4" />
                </Button>

                <Button
                  onClick={() => handleOpenEditModal(template)}
                  variant="secondary"
                  size="sm"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => handleOpenDeleteConfirm(template)}
                  variant="danger"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Template Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t("createTemplate", "Create Template")}
        size="xl"
      >
        <div className="space-y-6">
          {/* Template Name and Grade Level - Same Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Template Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("templateName", "Template Name")}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t("enterTemplateName", "Enter template name")}
              />
            </div>

            {/* Grade Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("gradeLevel", "Grade Level")}
              </label>
              <Dropdown
                value={formData.gradeLevel}
                onValueChange={(value) => setFormData({ ...formData, gradeLevel: value })}
                options={[
                  { value: "", label: t("selectGradeLevel", "Select Grade Level") },
                  ...gradeLevelOptions
                ]}
                placeholder={t("selectGradeLevel", "Select Grade Level")}
                className="w-full"
              />
            </div>
          </div>

          {/* Subject Items - Separate Row */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                {t("subjects", "Subjects")}
              </label>
              <Button
                onClick={handleAddItem}
                variant="secondary"
                size="xs"
                className="flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                {t("addSubject", "Add Subject")}
              </Button>
            </div>

            <p className="text-xs text-gray-500 mb-2">
              {t("dragToReorderHelp", "Use the drag handle to reorder subjects")}
            </p>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEndEdit}
              >
                <SortableContext
                  items={formData.items.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {formData.items.map((item, index) => (
                    <SortableEditItem
                      key={item.id}
                      item={item}
                      index={index}
                      subjects={subjects}
                      subSubjects={subSubjects}
                      onUpdate={handleUpdateItem}
                      onRemove={handleRemoveItem}
                      t={t}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button
              onClick={() => setShowCreateModal(false)}
              variant="secondary"
              size="sm"
            >
              {t("cancel", "Cancel")}
            </Button>
            <Button onClick={handleCreateTemplate} variant="primary" size="sm">
              <Check className="w-4 h-4 mr-1" />
              {t("create", "Create")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Template Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={t("editTemplate", "Edit Template")}
        size="xl"
      >
        <div className="space-y-6">
          {/* Template Name and Grade Level - Same Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Template Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("templateName", "Template Name")}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t("enterTemplateName", "Enter template name")}
              />
            </div>

            {/* Grade Level - Display Only */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("gradeLevel", "Grade Level")}
              </label>
              <input
                type="text"
                value={gradeLevelOptions.find(opt => opt.value === formData.gradeLevel)?.label || formData.gradeLevel}
                disabled
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t("gradeLevelCannotBeEdited", "Grade level cannot be changed after creation")}
              </p>
            </div>
          </div>

          {/* Subject Items - Separate Row */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                {t("subjects", "Subjects")}
              </label>
              <Button
                onClick={handleAddItem}
                variant="secondary"
                size="xs"
                className="flex items-center gap-2"
              >
                <Plus className="w-3 h-3" />
                {t("addSubject", "Add Subject")}
              </Button>
            </div>

            <p className="text-xs text-gray-500 mb-2">
              {t("dragToReorderHelp", "Use the drag handle to reorder subjects")}
            </p>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEndEdit}
              >
                <SortableContext
                  items={formData.items.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {formData.items.map((item, index) => (
                    <SortableEditItem
                      key={item.id}
                      item={item}
                      index={index}
                      subjects={subjects}
                      subSubjects={subSubjects}
                      onUpdate={handleUpdateItem}
                      onRemove={handleRemoveItem}
                      t={t}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button
              onClick={() => setShowEditModal(false)}
              variant="secondary"
              size="sm"
            >
              {t("cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleUpdateTemplate}
              variant="primary"
              size="sm"
              disabled={isLoading("updateTemplate")}
            >
              {isLoading("updateTemplate") ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  {t("updating", "Updating...")}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  {t("update", "Update")}
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Apply Template Modal */}
      <Modal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        title={t("applyTemplate", "Apply Template")}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t(
              "applyTemplateDesc",
              "Apply this template to a class for a specific month and year",
            )}
          </p>

          {/* Class Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("selectClass", "Select Class")}
            </label>
            <Dropdown
              value={applyFormData.classId}
              onValueChange={(value) =>
                setApplyFormData({ ...applyFormData, classId: value })
              }
              options={[
                { value: "", label: t("selectClass", "Select Class") },
                ...classes.map((cls) => ({
                  value: (cls.classId || cls.id).toString(),
                  label: cls.gradeLevel
                    ? `${t("class", "Class")} ${formatClassIdentifier(cls.gradeLevel, cls.section)}`
                    : cls.name || `${t("class", "Class")} ${cls.gradeLevel || ""}`,
                })),
              ]}
              placeholder={t("selectClass", "Select Class")}
              className="w-full"
            />
          </div>

          {/* Month Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("month", "Month")}
            </label>
            <Dropdown
              value={applyFormData.month.toString()}
              onValueChange={(value) =>
                setApplyFormData({ ...applyFormData, month: parseInt(value) })
              }
              options={[
                { value: "1", label: t("january", "January") },
                { value: "2", label: t("february", "February") },
                { value: "3", label: t("march", "March") },
                { value: "4", label: t("april", "April") },
                { value: "5", label: t("may", "May") },
                { value: "6", label: t("june", "June") },
                { value: "7", label: t("july", "July") },
                { value: "8", label: t("august", "August") },
                { value: "9", label: t("september", "September") },
                { value: "10", label: t("october", "October") },
                { value: "11", label: t("november", "November") },
                { value: "12", label: t("december", "December") },
              ]}
              placeholder={t("selectMonth", "Select Month")}
              className="w-full"
            />
          </div>

          {/* Year Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("year", "Year")}
            </label>
            <input
              type="number"
              value={applyFormData.year}
              onChange={(e) =>
                setApplyFormData({ ...applyFormData, year: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t("enterYear", "Enter year")}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button
              onClick={() => setShowApplyModal(false)}
              variant="secondary"
              size="sm"
            >
              {t("cancel", "Cancel")}
            </Button>
            <Button onClick={handleApplyTemplate} variant="primary" size="sm">
              <Play className="w-4 h-4 mr-1" />
              {t("apply", "Apply")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Preview Template Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title={t("previewTemplate", "Preview Template")}
        size="2xl"
      >
        {selectedTemplate && (
          <div className="space-y-4">
            {/* Template Info */}
            <div className="grid grid-cols-2 gap-4 pb-4 border-b">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("templateName", "Template Name")}
                </label>
                <p className="text-base font-semibold text-gray-900">
                  {selectedTemplate.name}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("gradeLevel", "Grade Level")}
                </label>
                <p className="text-base font-semibold text-gray-900">
                  {gradeLevelOptions.find(opt => opt.value === selectedTemplate.gradeLevel)?.label || selectedTemplate.gradeLevel}
                </p>
              </div>
            </div>

            {/* Subjects List */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t("subjects", "Subjects")} ({selectedTemplate.items?.length || 0})
              </label>
              <div className="shadow-lg rounded-sm overflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse bg-white">
                    <thead>
                      {/* Generates grouped headers logic */}
                      {(() => {
                        const groups = [];
                        let currentGroup = null;

                        (selectedTemplate.items || []).forEach((item) => {
                          if (!currentGroup || currentGroup.subjectId !== item.subjectId) {
                            currentGroup = {
                              subjectId: item.subjectId,
                              subjectName: item.subject?.khmerName || item.subject?.name || item.subjectName,
                              subSubjects: []
                            };
                            groups.push(currentGroup);
                          }

                          if (item.subSubjectId) {
                            currentGroup.subSubjects.push(item);
                          }
                        });

                        return (
                          <>
                            {/* Header Row 1: Main Subjects */}
                            <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                              {/* Student Name */}
                              <th
                                rowSpan={2}
                                className="px-6 py-3 text-left text-sm font-bold border-r border-blue-500 min-w-[200px] sticky left-0 z-20 bg-gradient-to-r from-blue-600 to-blue-700"
                              >
                                {t("studentName", "Student Name")}
                              </th>

                              {/* Grouped Subjects */}
                              {groups.map((group, groupIndex) => (
                                <th
                                  key={groupIndex}
                                  colSpan={group.subSubjects.length || 1}
                                  rowSpan={group.subSubjects.length > 0 ? 1 : 2}
                                  className="px-4 py-3 text-center text-sm font-bold border-r border-blue-500 min-w-[100px] bg-gradient-to-r from-blue-600 to-blue-700 whitespace-nowrap"
                                >
                                  {group.subjectName}
                                </th>
                              ))}

                              {/* Result Columns */}
                              <th rowSpan={2} className="px-4 py-3 text-center text-sm font-bold border-r border-blue-500 bg-gradient-to-r from-green-600 to-green-700 min-w-[80px]">
                                {t("totalScore", "Total")}
                              </th>
                              <th rowSpan={2} className="px-4 py-3 text-center text-sm font-bold border-r border-blue-500 bg-gradient-to-r from-purple-600 to-purple-700 min-w-[80px]">
                                {t("average", "Avg")}
                              </th>
                              <th rowSpan={2} className="px-4 py-3 text-center text-sm font-bold border-r border-blue-500 bg-gradient-to-r from-orange-600 to-orange-700 min-w-[100px]">
                                {t("grading", "Grade")}
                              </th>
                            </tr>

                            {/* Header Row 2: Sub-Subjects */}
                            <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                              {groups.map((group) => (
                                group.subSubjects.length > 0 && group.subSubjects.map((subItem, subIndex) => (
                                  <th
                                    key={`${group.subjectId}-${subIndex}`}
                                    className="px-4 py-2 text-center text-xs font-bold border-r border-blue-400 border-t border-blue-500 min-w-[100px] whitespace-nowrap"
                                  >
                                    {subItem.subSubject?.khmerName || subItem.subSubject?.name}
                                  </th>
                                ))
                              ))}
                            </tr>
                          </>
                        );
                      })()}
                    </thead>
                    <tbody>
                      {/* Dummy Row for Visualization */}
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <td className="p-4 text-sm text-gray-500 sticky left-0 bg-gray-50 border-r border-gray-200">
                          {t("exampleStudent", "Example Student")}
                        </td>
                        {selectedTemplate.items?.map((_, index) => (
                          <td key={index} className="p-4 border-r border-gray-200 bg-white"></td>
                        ))}
                        <td className="p-4 border-r border-gray-200 bg-green-50"></td>
                        <td className="p-4 border-r border-gray-200 bg-purple-50"></td>
                        <td className="p-4 border-r border-gray-200 bg-orange-50"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  {t("status", "Status")}
                </label>
                <Badge color={selectedTemplate.isActive ? "green" : "gray"} variant="solid">
                  {selectedTemplate.isActive ? t("active", "Active") : t("inactive", "Inactive")}
                </Badge>
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={() => setShowPreviewModal(false)}
                variant="secondary"
                size="sm"
              >
                {t("close", "Close")}
              </Button>
            </div>
          </div>
        )}
      </Modal>


      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setTemplateToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        type="danger"
        title={t("deleteTemplate", "Delete Template")}
        message={
          templateToDelete
            ? t(
              "confirmDeleteTemplateMessage",
              `Are you sure you want to delete "${templateToDelete.name}"? This action cannot be undone.`
            )
            : ""
        }
        confirmText={t("delete", "Delete")}
        cancelText={t("cancel", "Cancel")}
      />
    </div >
  );
}
