// ===== FILE: src/pages/PurchaseRequest/CreateRequest.tsx =====
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/client";
import { Paperclip, FileText, X, Loader2, Search, CheckCircle2 } from "lucide-react";

// ── Attachment helpers ────────────────────────────────────────────────────────
const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://10.10.50.23:5000/api").replace(/\/api\/?$/, "");

function getFileUrl(path?: string) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_ORIGIN}${path}`;
}

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
function isImageFile(fileName?: string) {
  if (!fileName) return false;
  return IMAGE_EXTS.includes(fileName.toLowerCase().slice(fileName.lastIndexOf(".")));
}

// ── Searchable Dropdown Component ────────────────────────────────────────────
interface SearchDropdownProps {
  items: any[];
  value: string;
  onChange: (id: string, item: any) => void;
  placeholder: string;
  displayFn: (item: any) => string;
  searchFn: (item: any, query: string) => boolean;
  disabled?: boolean;
  required?: boolean;
  onQueryChange?: (query: string) => void;
  loading?: boolean;
}

function SearchDropdown({
  items, value, onChange, placeholder, displayFn, searchFn, disabled, required,
  onQueryChange, loading,
}: SearchDropdownProps) {
  const [open,    setOpen]    = useState(false);
  const [query,   setQuery]   = useState("");
  const inputRef              = useRef<HTMLInputElement>(null);
  const wrapRef               = useRef<HTMLDivElement>(null);

  const selected = items.find(i => i.id === value);
  const filtered = query.trim()
    ? items.filter(i => searchFn(i, query.trim().toLowerCase()))
    : items;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function openDropdown() {
    if (disabled) return;
    setOpen(true);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function select(item: any) {
    onChange(item.id, item);
    setOpen(false);
    setQuery("");
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("", null);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={wrapRef} className="relative">
      <div
        onClick={openDropdown}
        className={`w-full border rounded-xl px-3 py-2 flex items-center justify-between cursor-pointer text-sm transition ${
          disabled
            ? "bg-gray-100 border-gray-200 cursor-not-allowed text-gray-400"
            : "border-gray-300 bg-white hover:border-blue-400 focus-within:ring-2 focus-within:ring-blue-200"
        }`}
      >
        <span className={selected ? "text-gray-800 font-medium" : "text-gray-400"}>
          {selected ? displayFn(selected) : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {selected && !disabled && (
            <button onClick={clear} className="text-gray-300 hover:text-gray-500 p-0.5">
              <X size={13} />
            </button>
          )}
          <Search size={14} className="text-gray-400" />
        </div>
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100 relative">
            <input
              ref={inputRef}
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                onQueryChange?.(e.target.value);
              }}
              placeholder="Type to search..."
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            {loading && (
              <Loader2 size={14} className="animate-spin text-blue-400 absolute right-4 top-1/2 -translate-y-1/2" />
            )}
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">
                {loading ? "Searching…" : "No results found"}
              </div>
            ) : (
              filtered.slice(0, 100).map(item => (
                <div
                  key={item.id}
                  onClick={() => select(item)}
                  className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 transition flex items-center justify-between ${
                    item.id === value ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
                  }`}
                >
                  <span>{displayFn(item)}</span>
                  {item.id === value && <CheckCircle2 size={14} className="text-blue-500 shrink-0" />}
                </div>
              ))
            )}
            {filtered.length > 100 && (
              <div className="px-4 py-2 text-xs text-gray-400 text-center border-t">
                Showing 100 of {filtered.length} — type to narrow results
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function CreateRequest() {
  const user          = JSON.parse(localStorage.getItem("user") || "{}");
  const navigate      = useNavigate();
  const [searchParams] = useSearchParams();
  const editId        = searchParams.get("edit");
  const isEditMode    = !!editId;

  const [companies,   setCompanies]   = useState<any[]>([]);
  const [projects,    setProjects]    = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [materials,   setMaterials]   = useState<any[]>([]);
  const [materialSearching, setMaterialSearching] = useState(false);
  const [msg,         setMsg]         = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [requestNo,   setRequestNo]   = useState("AUTO");
  const [editIndex,   setEditIndex]   = useState<number | null>(null);
  const [uploading,   setUploading]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);

  const [currentItem, setCurrentItem] = useState<any>({
    materialId: "", materialCode: "", materialName: "", quantity: 1,
    uom: "", requiredDate: new Date().toISOString().slice(0, 10),
    justification: "", estimatedUnitPrice: 0,
    attachmentUrl: "", attachmentFileName: "",
  });

  const [form, setForm] = useState<any>({
    companyId: "", projectId: "", departmentId: "",
    requestedById: user.id, justification: "",
    deliveryLocation: "", contactNumber: "",
    submit: true, items: [],
  });

  // ── Load companies + auto-select primary ──────────────────────────────────
  useEffect(() => {
    api.get(`/companies/user/${user.id}`)
      .then(r => {
        const list: any[] = r.data?.data ?? r.data ?? [];
        setCompanies(list);
        const primaryId = user.companyId;
        if (primaryId && list.some((c: any) => c.id === primaryId)) {
          handleCompanyChange(primaryId, list);
        } else if (list.length === 1) {
          handleCompanyChange(list[0].id, list);
        }
      })
      .catch(console.error);
  }, []);

  // ── Load edit data ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!editId) return;
    api.get(`/purchase-requests/${editId}`).then(async r => {
      const pr = r.data?.data ?? r.data;
      setRequestNo(pr.requestNumber);

      const { projList, deptList } = pr.companyId
        ? await loadCompanyData(pr.companyId)
        : { projList: [], deptList: [] };

      const validProjectId = projList.some((p: any) => p.id === pr.projectId)
        ? pr.projectId : "";
      const validDeptId = deptList.some((d: any) => d.id === pr.departmentId)
        ? pr.departmentId : "";

      setForm({
        companyId:        pr.companyId,
        projectId:        validProjectId,
        departmentId:      validDeptId,
        requestedById:     user.id,
        justification:     pr.justification ?? "",
        deliveryLocation:  pr.deliveryLocation ?? "",
        contactNumber:     pr.contactNumber ?? "",
        submit:            true,
        items: (pr.items ?? []).map((i: any) => ({
          materialId:         i.materialId,
          materialCode:       i.materialCode,
          materialName:       i.materialName,
          quantity:           i.quantity,
          uom:                i.uom,
          requiredDate:       i.requiredDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
          justification:      i.justification ?? "",
          estimatedUnitPrice: i.estimatedUnitPrice,
          attachmentUrl:      i.attachmentUrl      ?? "",
          attachmentFileName: i.attachmentFileName ?? "",
        })),
      });
    }).catch(console.error);
  }, [editId]);

  // ── Company change handler — loads projects + departments + materials ──────
  async function handleCompanyChange(companyId: string, companiesList?: any[]) {
    const list = companiesList ?? companies;
    setForm((f: any) => ({
      ...f,
      companyId,
      projectId:    "",
      departmentId: "",
      items:        isEditMode ? f.items : [],
    }));
    setProjects([]);
    setDepartments([]);
    setMaterials([]);
    if (!companyId) return;
    await loadCompanyData(companyId);
  }

  async function loadCompanyData(companyId: string) {
    try {
      const [projRes, deptRes, matRes] = await Promise.all([
        api.get(`/projects/company/${companyId}`),
        api.get(`/departments/by-company/${companyId}`),
        api.get(`/materials`, { params: { companyId, page: 1, pageSize: 500 } }),
      ]);

      const projList = projRes.data?.data ?? projRes.data ?? [];
      const deptList = deptRes.data?.data ?? deptRes.data ?? [];
      const matList  = matRes.data?.items ?? matRes.data?.data ?? matRes.data ?? [];

      setProjects(Array.isArray(projList) ? projList : []);
      setDepartments(Array.isArray(deptList) ? deptList : []);
      setMaterials(Array.isArray(matList) ? matList : []);

      return { projList, deptList };
    } catch (err) {
      console.error("Failed to load company data", err);
      return { projList: [], deptList: [] };
    }
  }

  // ── Live material search (debounced backend query) ─────────────────────────
  const materialSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleMaterialSearch(query: string) {
    if (materialSearchTimeout.current) clearTimeout(materialSearchTimeout.current);

    materialSearchTimeout.current = setTimeout(async () => {
      if (!form.companyId) return;

      if (!query.trim()) {
        setMaterialSearching(true);
        try {
          const r = await api.get(`/materials`, {
            params: { companyId: form.companyId, page: 1, pageSize: 500 }
          });
          const list = r.data?.items ?? r.data?.data ?? r.data ?? [];
          setMaterials(Array.isArray(list) ? list : []);
        } finally {
          setMaterialSearching(false);
        }
        return;
      }

      setMaterialSearching(true);
      try {
        const r = await api.get(`/materials`, {
          params: { companyId: form.companyId, page: 1, pageSize: 100, search: query.trim() }
        });
        const list = r.data?.items ?? r.data?.data ?? r.data ?? [];
        setMaterials(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("Material search failed", err);
      } finally {
        setMaterialSearching(false);
      }
    }, 350);
  }

  // ── Project select — auto-fill department ─────────────────────────────────
  function onProjectSelect(projectId: string, _item: any) {
    const selected = projects.find(p => p.id === projectId);
    setForm((f: any) => ({
      ...f,
      projectId,
      departmentId: selected?.departmentId ?? f.departmentId,
    }));
  }

  // ── Item field helpers ────────────────────────────────────────────────────
  function setCurrentItemField(key: string, value: any) {
    const updated = { ...currentItem, [key]: value };
    if (key === "materialId") {
      const selected = materials.find(m => m.id === value);
      if (selected) {
        updated.materialCode = selected.itemCode ?? selected.materialCode ?? "";
        updated.materialName = selected.name ?? "";
        updated.uom          = selected.uom ?? "";
      }
    }
    setCurrentItem(updated);
  }

  // ── Attachment upload ─────────────────────────────────────────────────────
  async function handleAttachmentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!form.companyId) {
      showMsg("Please select a Company first before attaching a file.", "error");
      e.target.value = "";
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("companyId", form.companyId);
    try {
      setUploading(true);
      const res = await api.post("/attachments/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCurrentItem((prev: any) => ({
        ...prev,
        attachmentUrl:      res.data.fileUrl,
        attachmentFileName: res.data.fileName,
      }));
    } catch (err: any) {
      showMsg(err.response?.data?.message || "Failed to upload attachment", "error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removeAttachment() {
    setCurrentItem((prev: any) => ({ ...prev, attachmentUrl: "", attachmentFileName: "" }));
  }

  // ── Item list helpers ─────────────────────────────────────────────────────
  function clearItemForm() {
    setCurrentItem({
      materialId: "", materialCode: "", materialName: "", quantity: 1,
      uom: "", requiredDate: new Date().toISOString().slice(0, 10),
      justification: "", estimatedUnitPrice: 0,
      attachmentUrl: "", attachmentFileName: "",
    });
    setEditIndex(null);
  }

  function addOrUpdateItem() {
    if (!currentItem.materialId) { showMsg("Please select a material", "error"); return; }
    if (Number(currentItem.quantity) <= 0) { showMsg("Quantity must be greater than 0", "error"); return; }
    if (editIndex !== null) {
      const updated = [...form.items];
      updated[editIndex] = currentItem;
      setForm((f: any) => ({ ...f, items: updated }));
    } else {
      setForm((f: any) => ({ ...f, items: [...f.items, currentItem] }));
    }
    clearItemForm();
  }

  function editItem(index: number) {
    setCurrentItem(form.items[index]);
    setEditIndex(index);
    window.scrollTo({ top: 400, behavior: "smooth" });
  }

  function deleteItem(index: number) {
    setForm((f: any) => ({ ...f, items: f.items.filter((_: any, i: number) => i !== index) }));
  }

  const totalAmount = form.items.reduce(
    (sum: number, i: any) => sum + Number(i.quantity || 0) * Number(i.estimatedUnitPrice || 0), 0
  );

  function showMsg(text: string, type: "success" | "error") {
    setMsg({ text, type });
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (type === "success") setTimeout(() => setMsg(null), 4000);
  }

  async function submitRequest(isSubmit: boolean) {
    if (!form.companyId)         { showMsg("Please select a Company", "error");         return; }
    if (!form.projectId)         { showMsg("Please select a Project", "error");         return; }
    if (!form.deliveryLocation?.trim()) { showMsg("Please enter Delivery Location", "error"); return; }
    if (!form.contactNumber?.trim())    { showMsg("Please enter Contact Number", "error");    return; }
    if (form.items.length === 0) { showMsg("Please add at least one item", "error");    return; }
    if (submitting)              return;

    setSubmitting(true);
    try {
      const payload = {
        companyId:         form.companyId,
        projectId:         form.projectId,
        departmentId:      form.departmentId || null,
        requestedById:     form.requestedById,
        justification:     form.justification,
        deliveryLocation:  form.deliveryLocation,
        contactNumber:     form.contactNumber,
        submit:            isSubmit,
        items: form.items.map((i: any) => ({
          materialId:         i.materialId,
          quantity:           Number(i.quantity),
          uom:                i.uom,
          requiredDate:       i.requiredDate,
          justification:      i.justification,
          estimatedUnitPrice: Number(i.estimatedUnitPrice),
          attachmentUrl:      i.attachmentUrl  || null,
          attachmentFileName: i.attachmentFileName || null,
        })),
      };

      if (isEditMode && editId) {
        await api.put(`/purchase-requests/${editId}`, payload);
        if (isSubmit) {
          const res = await api.post(`/purchase-requests/${editId}/resubmit`);
          showMsg(`✅ Resubmitted: ${requestNo} — ${res.data.message || ""}`, "success");
        } else {
          showMsg(`✅ Draft updated: ${requestNo}`, "success");
        }
      } else {
        const res = await api.post("/purchase-requests", payload);
        const num = res.data.requestNumber;
        setRequestNo(num);
        showMsg(
          isSubmit
            ? `✅ Request ${num} submitted for approval!`
            : `✅ Draft saved: ${num}`,
          "success"
        );
      }

      setTimeout(() => navigate("/my-requests"), 1800);

    } catch (err: any) {
      showMsg(err?.response?.data?.message || "Failed to save request. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <div className="border-l-4 border-blue-600 pl-4">
            <h1 className="text-2xl font-bold text-gray-800">
              {isEditMode ? "Edit Purchase Request" : "Create Purchase Request"}
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              {isEditMode ? "Correct and resubmit your returned request" : "Raise a new material / procurement request"}
            </p>
          </div>
        </div>

        {msg && (
          <div className={`px-5 py-4 rounded-xl border text-sm font-medium flex items-center gap-3 ${
            msg.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}>
            {msg.type === "success" ? <CheckCircle2 size={18} className="text-green-600 shrink-0" /> : <X size={18} className="text-red-500 shrink-0" />}
            {msg.text}
          </div>
        )}

        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6 space-y-5">
          <div className="border-l-4 border-blue-600 pl-3">
            <h2 className="text-lg font-semibold text-gray-800">Request Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

            <div>
              <label className="block text-sm text-gray-500 mb-1.5 font-medium">Request Number</label>
              <input disabled value={requestNo}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-gray-100 text-sm text-gray-500" />
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1.5 font-medium">
                Company <span className="text-red-500">*</span>
              </label>
              <select
                value={form.companyId}
                onChange={e => handleCompanyChange(e.target.value)}
                disabled={isEditMode}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="">— Select Company —</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1.5 font-medium">
                Project <span className="text-red-500">*</span>
              </label>
              <SearchDropdown
                items={projects}
                value={form.projectId}
                onChange={onProjectSelect}
                placeholder={form.companyId ? "Search project..." : "Select company first"}
                disabled={!form.companyId}
                displayFn={p => `${p.externalCode || p.code || "PRJ"} — ${p.name}`}
                searchFn={(p, q) =>
                  p.name?.toLowerCase().includes(q) ||
                  (p.externalCode ?? "").toLowerCase().includes(q) ||
                  (p.code ?? "").toLowerCase().includes(q)
                }
              />
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1.5 font-medium">Department</label>
              <select
                value={form.departmentId}
                onChange={e => setForm((f: any) => ({ ...f, departmentId: e.target.value }))}
                disabled={!form.companyId}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="">— Select Department —</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {form.companyId && departments.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">No departments found</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1.5 font-medium">
                Delivery Location <span className="text-red-500">*</span>
              </label>
              <input
                value={form.deliveryLocation}
                onChange={e => setForm((f: any) => ({ ...f, deliveryLocation: e.target.value }))}
                placeholder="e.g. Main Store, Site A Warehouse"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1.5 font-medium">
                Contact Number <span className="text-red-500">*</span>
              </label>
              <input
                value={form.contactNumber}
                onChange={e => setForm((f: any) => ({ ...f, contactNumber: e.target.value }))}
                placeholder="e.g. +974 5555 1234"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
              />
            </div>

          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1.5 font-medium">Business Justification</label>
            <textarea
              rows={3}
              value={form.justification}
              onChange={e => setForm((f: any) => ({ ...f, justification: e.target.value }))}
              placeholder="Describe why this purchase is needed..."
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="border-l-4 border-blue-600 pl-3">
              <h2 className="text-lg font-semibold text-gray-800">
                {editIndex !== null ? "Edit Item" : "Add Item"}
              </h2>
            </div>
            {editIndex !== null && (
              <button onClick={clearItemForm}
                className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-xl">
                Cancel Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

            <div className="lg:col-span-2">
              <label className="block text-sm text-gray-500 mb-1.5 font-medium">
                Material <span className="text-red-500">*</span>
              </label>
              <SearchDropdown
                items={materials}
                value={currentItem.materialId}
                onChange={(id, item) => setCurrentItemField("materialId", id)}
                placeholder={form.companyId ? "Search by code or name..." : "Select company first"}
                disabled={!form.companyId}
                displayFn={m => `${m.itemCode ?? m.materialCode ?? ""} — ${m.name}`}
                searchFn={(m, q) =>
                  m.name?.toLowerCase().includes(q) ||
                  (m.itemCode ?? m.materialCode ?? "").toLowerCase().includes(q)
                }
                onQueryChange={handleMaterialSearch}
                loading={materialSearching}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1.5 font-medium">UOM</label>
              <input
                value={currentItem.uom}
                onChange={e => setCurrentItemField("uom", e.target.value)}
                placeholder="e.g. PCS, KG, MTR"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1.5 font-medium">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                value={currentItem.quantity}
                onChange={e => setCurrentItemField("quantity", e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1.5 font-medium">Estimated Unit Price (QAR)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={currentItem.estimatedUnitPrice}
                onChange={e => setCurrentItemField("estimatedUnitPrice", e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1.5 font-medium">Required Date</label>
              <input
                type="date"
                value={currentItem.requiredDate}
                onChange={e => setCurrentItemField("requiredDate", e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm text-gray-500 mb-1.5 font-medium">Item Justification</label>
              <input
                value={currentItem.justification}
                onChange={e => setCurrentItemField("justification", e.target.value)}
                placeholder="Why is this specific item needed?"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1.5 font-medium">Line Total</label>
              <div className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-blue-50 text-blue-700 font-semibold text-sm">
                QAR {(Number(currentItem.quantity || 0) * Number(currentItem.estimatedUnitPrice || 0)).toLocaleString("en-QA", { minimumFractionDigits: 2 })}
              </div>
            </div>

          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1.5 font-medium">Attachment (optional)</label>
            {!currentItem.attachmentUrl ? (
              <label className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed cursor-pointer text-sm transition ${
                uploading ? "border-gray-200 text-gray-300 bg-gray-50" : "border-gray-300 text-gray-500 hover:border-blue-400 hover:bg-blue-50"
              }`}>
                {uploading
                  ? <><Loader2 size={15} className="animate-spin" /> Uploading...</>
                  : <><Paperclip size={15} /> Attach file</>}
                <input type="file" className="hidden"
                  accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleAttachmentChange} disabled={uploading} />
              </label>
            ) : (
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-fit">
                {isImageFile(currentItem.attachmentFileName) ? (
                  <img src={getFileUrl(currentItem.attachmentUrl)} alt={currentItem.attachmentFileName}
                    className="w-10 h-10 object-cover rounded-lg border border-gray-200" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <FileText size={18} />
                  </div>
                )}
                <span className="text-sm text-gray-700 max-w-[180px] truncate">{currentItem.attachmentFileName}</span>
                <button onClick={removeAttachment} className="text-gray-400 hover:text-red-500 transition">
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={addOrUpdateItem}
            disabled={!currentItem.materialId}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {editIndex !== null ? "✓ Update Item" : "+ Add Item"}
          </button>
        </div>

        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
          <div className="border-l-4 border-blue-600 pl-3 mb-5 flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-800">Request Items</h2>
            {form.items.length > 0 && (
              <span className="text-sm text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
                {form.items.length} item{form.items.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {form.items.length === 0 ? (
            <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
              <FileText size={32} className="mx-auto mb-2 text-gray-300" />
              No items added yet
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {["#", "Code", "Material", "Qty", "UOM", "Unit Price", "Total", "Required", "Justification", "Attach", ""].map(h => (
                        <th key={h} className="text-left px-3 py-3 text-gray-500 font-medium text-xs whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {form.items.map((item: any, index: number) => (
                      <tr key={index} className={`hover:bg-gray-50 transition ${editIndex === index ? "bg-blue-50" : ""}`}>
                        <td className="px-3 py-3 text-gray-400 text-xs">{index + 1}</td>
                        <td className="px-3 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">{item.materialCode}</td>
                        <td className="px-3 py-3 text-gray-800 font-medium max-w-[160px] truncate" title={item.materialName}>{item.materialName || item.materialCode}</td>
                        <td className="px-3 py-3 font-semibold">{item.quantity}</td>
                        <td className="px-3 py-3 text-gray-500">{item.uom}</td>
                        <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                          {Number(item.estimatedUnitPrice || 0).toLocaleString("en-QA", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-3 font-semibold text-blue-700 whitespace-nowrap">
                          {(Number(item.quantity) * Number(item.estimatedUnitPrice)).toLocaleString("en-QA", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-3 text-gray-500 whitespace-nowrap text-xs">
                          {item.requiredDate ? new Date(item.requiredDate).toLocaleDateString("en-GB", { day:"2-digit", month:"short" }) : "—"}
                        </td>
                        <td className="px-3 py-3 text-gray-500 text-xs max-w-[140px]">
                          <span className="italic truncate block" title={item.justification}>{item.justification || "—"}</span>
                        </td>
                        <td className="px-3 py-3">
                          {item.attachmentUrl ? (
                            isImageFile(item.attachmentFileName) ? (
                              <a href={getFileUrl(item.attachmentUrl)} target="_blank" rel="noreferrer">
                                <img src={getFileUrl(item.attachmentUrl)} alt="" className="w-8 h-8 object-cover rounded-lg border" />
                              </a>
                            ) : (
                              <a href={getFileUrl(item.attachmentUrl)} target="_blank" rel="noreferrer"
                                className="text-blue-500 hover:underline">
                                <Paperclip size={14} />
                              </a>
                            )
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => editItem(index)}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                            <button onClick={() => deleteItem(index)}
                              className="text-red-500 hover:text-red-700 text-xs font-medium">Del</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end mt-5">
                <div className="bg-blue-50 border border-blue-200 px-6 py-3 rounded-xl">
                  <span className="text-sm text-blue-600 font-medium">Grand Total: </span>
                  <span className="text-lg font-bold text-blue-700 ml-2">
                    QAR {totalAmount.toLocaleString("en-QA", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 justify-end pb-8">
          <button
            type="button"
            onClick={() => navigate("/my-requests")}
            disabled={submitting}
            className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>

          {(!isEditMode || (isEditMode && form.items.length > 0)) && (
            <button
              type="button"
              onClick={() => submitRequest(false)}
              disabled={submitting}
              className="px-6 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
              {isEditMode ? "Save Changes" : "Save Draft"}
            </button>
          )}

          <button
            type="button"
            onClick={() => submitRequest(true)}
            disabled={submitting || form.items.length === 0}
            className="px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
          >
            {submitting
              ? <><Loader2 size={15} className="animate-spin" /> Processing...</>
              : isEditMode ? "Save & Resubmit" : "Submit for Approval"
            }
          </button>
        </div>

      </div>
    </div>
  );
}
