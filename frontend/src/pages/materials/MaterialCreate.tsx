import { useEffect, useState, useRef } from "react";
import api from "../../api/client";
import { useNavigate } from "react-router-dom";

// ── Reusable searchable dropdown ─────────────────────────────────────────
// A lightweight, dependency-free searchable <select> replacement: click to
// open, type to filter, click an option (or outside) to close. Used for
// Company / Main Group / Sub Group / Unit below since some of these lists
// can get long and a plain <select> is slow to scan.
function SearchableSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  required = false,
}: {
  label: string;
  options: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={boxRef} className="relative">
      <label className="block text-sm mb-1">{label}</label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`w-full border rounded px-3 py-2 text-left bg-white flex items-center justify-between ${
          disabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : ""
        }`}
      >
        <span className={selected ? "" : "text-gray-400"}>
          {selected ? selected.name : placeholder}
        </span>
        <span className="text-gray-400 text-xs ml-2">▾</span>
      </button>

      {/* Hidden input to keep native form "required" validation working */}
      {required && (
        <input
          tabIndex={-1}
          value={value}
          required
          onChange={() => {}}
          className="absolute opacity-0 pointer-events-none w-0 h-0"
        />
      )}

      {open && !disabled && (
        <div className="absolute z-20 mt-1 w-full bg-white border rounded shadow-lg max-h-64 overflow-hidden flex flex-col">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="w-full border-b px-3 py-2 text-sm focus:outline-none"
          />
          <div className="overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400">No matches</div>
            ) : (
              filtered.map((o) => (
                <div
                  key={o.id}
                  onClick={() => {
                    onChange(o.id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${
                    o.id === value ? "bg-blue-50 font-medium" : ""
                  }`}
                >
                  {o.name}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MaterialCreate() {

  const navigate = useNavigate();

  const [form, setForm] = useState({
    itemCode: "",
    name: "",
    description: "",

    groupId: "",
    subGroupId: "",

    unitId: "",
    companyId: ""
  });

  const [companies, setCompanies] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [subGroups, setSubGroups] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);

  // ✅ Load initial dropdowns
  useEffect(() => {

    // Only manual-entry companies belong here — Oracle-integrated companies
    // get their item master from the Bright ERP sync, not this form.
    // Filtered by the AllowManualItemCreation flag (not a hardcoded company
    // list, and not IsOracleIntegrated — several manual-entry companies are
    // still flagged IsOracleIntegrated=1), so any future manual-entry
    // company shows up automatically once an admin sets the flag.
    api.get("/companies")
      .then(r => setCompanies((r.data || []).filter((c: any) => c.allowManualItemCreation)));

   
api.get("/materialgroups")
  .then(r => setGroups(r.data));


    api.get("/units")
      .then(r => setUnits(r.data));

  }, []);

  // ✅ Load subgroups when main group changes
  useEffect(() => {

    if (form.groupId) {

    
api
  .get(`/materialsubgroups?groupId=${form.groupId}`)
  .then(r => setSubGroups(r.data));


    } else {

      setSubGroups([]);

    }

  }, [form.groupId]);

  // ✅ Handle input change
  const handleChange = (e: any) => {

    setForm({
      ...form,
      [e.target.name]: e.target.value
    });

  };

  // ✅ Save item
  const handleSubmit = async (e: any) => {

    e.preventDefault();

    try {

      setLoading(true);

      
await api.post("/materials", {

  itemCode: form.itemCode,

  name: form.name,

  description: form.description,

  groupId: form.groupId || null,

  subGroupId: form.subGroupId || null,

  unitId: form.unitId || null,

  companyId: form.companyId

});


      alert("✅ Item Created Successfully");

      navigate("/dashboard");

    } catch (err: any) {

      console.error(err);

      alert("❌ Failed to create item");

    } finally {

      setLoading(false);

    }

  };

  return (

    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-6">

      {/* HEADER */}
      <div className="mb-6 border-b pb-3">

        <h1 className="text-2xl font-semibold">
          Item Master
        </h1>

        <p className="text-gray-500 text-sm">
          Create manual items for procurement and MR flow
        </p>

      </div>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-5"
      >

        {/* Item Code */}
        <div>

          <label className="block text-sm mb-1">
            Item Code
          </label>

          <input
            type="text"
            name="itemCode"
            value={form.itemCode}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            required
          />

        </div>

        {/* Item Name */}
        <div>

          <label className="block text-sm mb-1">
            Item Name
          </label>

          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            required
          />

        </div>

        {/* Company — searchable, non-Oracle companies only */}
        <SearchableSelect
          label="Company"
          options={companies.map((c) => ({ id: c.id, name: c.name }))}
          value={form.companyId}
          onChange={(id) => setForm((f) => ({ ...f, companyId: id }))}
          placeholder="Select Company"
          required
        />

        {/* Main Group — searchable */}
        <SearchableSelect
          label="Main Group"
          options={groups.map((g) => ({ id: g.id, name: g.name }))}
          value={form.groupId}
          onChange={(id) => setForm((f) => ({ ...f, groupId: id, subGroupId: "" }))}
          placeholder="Select Main Group"
        />

        {/* Sub Group — searchable, depends on Main Group */}
        <SearchableSelect
          label="Sub Group"
          options={subGroups.map((s) => ({ id: s.id, name: s.name }))}
          value={form.subGroupId}
          onChange={(id) => setForm((f) => ({ ...f, subGroupId: id }))}
          placeholder={form.groupId ? "Select Sub Group" : "Select Main Group first"}
          disabled={!form.groupId}
        />

        {/* Default Unit — searchable */}
        <SearchableSelect
          label="Unit"
          options={units.map((u) => ({ id: u.id, name: u.name }))}
          value={form.unitId}
          onChange={(id) => setForm((f) => ({ ...f, unitId: id }))}
          placeholder="Select Unit"
        />

        {/* Description */}
        <div className="md:col-span-2">

          <label className="block text-sm mb-1">
            Description
          </label>

          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            rows={4}
          />

        </div>

        {/* Buttons */}
        <div className="md:col-span-2 flex justify-end gap-3 pt-3">

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="bg-gray-200 px-4 py-2 rounded"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded"
          >
            {loading ? "Saving..." : "Save Item"}
          </button>

        </div>

      </form>

    </div>

  );
}
