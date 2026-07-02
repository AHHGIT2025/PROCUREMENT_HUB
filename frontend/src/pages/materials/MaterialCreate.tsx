
import { useEffect, useState } from "react";
import api from "../../api/client";
import { useNavigate } from "react-router-dom";

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

    api.get("/companies")
      .then(r => setCompanies(r.data));

   
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

      navigate("/materials");

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

        {/* Company */}
        <div>

          <label className="block text-sm mb-1">
            Company
          </label>

          <select
            name="companyId"
            value={form.companyId}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            required
          >

            <option value="">
              Select Company
            </option>

            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}

          </select>

        </div>

        {/* Main Group */}
        <div>

          <label className="block text-sm mb-1">
            Main Group
          </label>

          <select
            name="groupId"
            value={form.groupId}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          >

            <option value="">
              Select Main Group
            </option>

            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}

          </select>

        </div>

        {/* Sub Group */}
        <div>

          <label className="block text-sm mb-1">
            Sub Group
          </label>

          <select
            name="subGroupId"
            value={form.subGroupId}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          >

            <option value="">
              Select Sub Group
            </option>

            {subGroups.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}

          </select>

        </div>

        {/* Default Unit */}
        <div>

          <label className="block text-sm mb-1">
            Unit
          </label>

          <select
            name="unitId"
            value={form.unitId}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          >

            <option value="">
              Select Unit
            </option>

            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}

          </select>

        </div>

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
            onClick={() => navigate("/materials")}
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
