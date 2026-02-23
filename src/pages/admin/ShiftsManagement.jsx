import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, Clock } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { PageTransition, FadeInSection } from "../../components/ui/PageTransition";
import { Button } from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import shiftService from "../../utils/api/services/shiftService";

const EMPTY_FORM = { name: "", startTime: "", endTime: "", description: "" };

export default function ShiftsManagement() {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();

  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    const res = await shiftService.getShifts();
    if (res.success) {
      setShifts(res.data);
    } else {
      showError(res.error || t("errorFetching", "Failed to load shifts"));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = t("required", "Required");
    if (!form.startTime) errors.startTime = t("required", "Required");
    if (!form.endTime) errors.endTime = t("required", "Required");
    if (form.startTime && form.endTime && form.startTime >= form.endTime) {
      errors.endTime = t("endTimeMustBeAfterStart", "End time must be after start time");
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenAdd = () => {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleOpenEdit = (shift) => {
    setSelectedShift(shift);
    setForm({
      name: shift.name || "",
      startTime: shift.startTime || "",
      endTime: shift.endTime || "",
      description: shift.description || "",
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const handleOpenDelete = (shift) => {
    setSelectedShift(shift);
    setShowDeleteDialog(true);
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setSubmitting(true);
    const res = await shiftService.createShift(form);
    setSubmitting(false);
    if (res.success) {
      showSuccess(t("shiftCreated", "Shift created successfully"));
      setShowAddModal(false);
      fetchShifts();
    } else {
      showError(res.error || t("errorCreating", "Failed to create shift"));
    }
  };

  const handleUpdate = async () => {
    if (!validate()) return;
    setSubmitting(true);
    const res = await shiftService.updateShift(selectedShift.id, form);
    setSubmitting(false);
    if (res.success) {
      showSuccess(t("shiftUpdated", "Shift updated successfully"));
      setShowEditModal(false);
      fetchShifts();
    } else {
      showError(res.error || t("errorUpdating", "Failed to update shift"));
    }
  };

  const handleDelete = async () => {
    const res = await shiftService.deleteShift(selectedShift.id);
    if (res.success) {
      showSuccess(t("shiftDeleted", "Shift deleted successfully"));
      setShowDeleteDialog(false);
      fetchShifts();
    } else {
      showError(res.error || t("errorDeleting", "Failed to delete shift"));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const columns = [
    {
      key: "index",
      header: "ល.រ",
      disableSort: true,
      render: (_, rowIndex) => (
        <span className="text-gray-500">{rowIndex + 1}</span>
      ),
    },
    {
      key: "name",
      header: t("shift", "Shift"),
      accessor: "name",
      render: (shift) => (
        <span className="font-medium text-gray-900">{shift.name}</span>
      ),
    },
    {
      key: "startTime",
      header: t("startTime", "Start Time"),
      accessor: "startTime",
      render: (shift) => (
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3 h-3 text-gray-400" />
          {shift.startTime}
        </span>
      ),
    },
    {
      key: "endTime",
      header: t("endTime", "End Time"),
      accessor: "endTime",
      render: (shift) => (
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3 h-3 text-gray-400" />
          {shift.endTime}
        </span>
      ),
    },
    {
      key: "description",
      header: t("description", "Description"),
      accessor: "description",
      disableSort: true,
      cellClassName: "max-w-xs truncate",
      render: (shift) => (
        <span className="text-gray-500">{shift.description || "—"}</span>
      ),
    },
    {
      key: "actions",
      header: t("actions", "Actions"),
      disableSort: true,
      headerClassName: "text-right",
      cellClassName: "text-right",
      render: (shift) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); handleOpenEdit(shift); }}
            className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
            title={t("edit", "Edit")}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); handleOpenDelete(shift); }}
            className="text-red-500 hover:bg-red-50 hover:text-red-600"
            title={t("delete", "Delete")}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageTransition variant="fade" className="flex-1 bg-gray-50">
      <div className="p-4 sm:p-6">
        <FadeInSection>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="space-y-1">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                  {t("shiftsManagement", "Shifts Management")}
                </h1>
                <p className="text-sm text-gray-500">
                  {t("shiftsManagementDesc", "Manage attendance shift schedules")}
                </p>
              </div>
            </div>
            <Button
              onClick={handleOpenAdd}
              className="flex items-center gap-2"
              size="sm"
              variant="primary"
            >
              <Plus className="w-4 h-4" />
              {t("addShift", "Add Shift")}
            </Button>
          </div>
        </FadeInSection>
        <FadeInSection>
          <div>
            {/* Table */}
            <Table
              columns={columns}
              data={shifts}
              loading={loading}
              emptyIcon={Clock}
              emptyMessage={t("noShifts", "No shifts found")}
              emptyDescription={t("noShiftsDesc", "Create your first shift to get started")}
              emptyActionLabel={t("addShift", "Add Shift")}
              onEmptyAction={handleOpenAdd}
              t={t}
            />
          </div>

          {/* Add Modal */}
          <Modal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            title={t("addShift", "Add Shift")}
            size="md"
            footer={
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddModal(false)} size="sm">
                  {t("cancel", "Cancel")}
                </Button>
                <Button onClick={handleCreate} disabled={submitting} size="sm">
                  {submitting ? t("saving", "Saving...") : t("save", "Save")}
                </Button>
              </div>
            }
          >
            <ShiftForm form={form} errors={formErrors} onChange={handleChange} t={t} />
          </Modal>

          {/* Edit Modal */}
          <Modal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            title={t("editShift", "Edit Shift")}
            size="md"
            footer={
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditModal(false)} size="sm">
                  {t("cancel", "Cancel")}
                </Button>
                <Button onClick={handleUpdate} disabled={submitting} size="sm">
                  {submitting ? t("saving", "Saving...") : t("save", "Save")}
                </Button>
              </div>
            }
          >
            <ShiftForm form={form} errors={formErrors} onChange={handleChange} t={t} />
          </Modal>

          {/* Delete Confirm */}
          <ConfirmDialog
            isOpen={showDeleteDialog}
            onClose={() => setShowDeleteDialog(false)}
            onConfirm={handleDelete}
            title={t("deleteShift", "Delete Shift")}
            message={t(
              "deleteShiftConfirm",
              `Are you sure you want to delete "${selectedShift?.name}"? This action cannot be undone.`
            )}
            confirmText={t("delete", "Delete")}
            confirmVariant="danger"
          />
        </FadeInSection>
      </div>
    </PageTransition>
  );
}

function ShiftForm({ form, errors, onChange, t }) {
  return (
    <div className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("shiftName", "Name")} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={onChange}
          placeholder={t("shiftNamePlaceholder", "e.g. Morning")}
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? "border-red-400" : "border-gray-300"
            }`}
        />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
      </div>

      {/* Start / End Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("startTime", "Start Time")} <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            name="startTime"
            value={form.startTime}
            onChange={onChange}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.startTime ? "border-red-400" : "border-gray-300"
              }`}
          />
          {errors.startTime && <p className="mt-1 text-xs text-red-500">{errors.startTime}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("endTime", "End Time")} <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            name="endTime"
            value={form.endTime}
            onChange={onChange}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.endTime ? "border-red-400" : "border-gray-300"
              }`}
          />
          {errors.endTime && <p className="mt-1 text-xs text-red-500">{errors.endTime}</p>}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("description", "Description")}
        </label>
        <textarea
          name="description"
          value={form.description}
          onChange={onChange}
          rows={3}
          placeholder={t("shiftDescPlaceholder", "Optional description...")}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>
    </div>
  );
}
