
import { useEffect, useState } from "react";
import api from "../../api/client";
import { useNavigate } from "react-router-dom";

export default function ProjectCreate() {

  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    companyId: "",
    departmentId: ""
  });

  const [companies, setCompanies] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);

  // ✅ Load Companies
  useEffect(() => {

    api
      .get("/companies")
      .then(r => setCompanies(r.data));

  }, []);

  // ✅ Load Departments when company changes
  useEffect(() => {

    if (form.companyId) {

       
      api.get(`/departments/by-company/${form.companyId}`)
        .then(r => setDepartments(r.data));

    } else {

      setDepartments([]);

    }

  }, [form.companyId]);

  // ✅ Handle Input
  const handleChange = (e: any) => {

    setForm({
      ...form,
      [e.target.name]: e.target.value
    });

  };

  // ✅ Save Project

const handleSubmit = async (e: any) => {

  e.preventDefault();

  try {

    setLoading(true);

    await api.post("/projects", {

      name: form.name,

      companyId: form.companyId,

      departmentId:
        form.departmentId && form.departmentId !== ""
          ? form.departmentId
          : null,

      sourceType: "MANUAL",

      externalCode: null

    });

    alert("✅ Project Created Successfully");

    navigate("/projects");

  } catch (err: any) {

    console.error(err.response?.data);

    alert(
      JSON.stringify(err.response?.data)
    );

  } finally {

    setLoading(false);

  }

};

  return (

    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-6">

      {/* HEADER */}
      <div className="mb-6 border-b pb-3">

        <h1 className="text-2xl font-semibold">
          Project Master
        </h1>

        <p className="text-gray-500 text-sm">
          Create and manage procurement projects
        </p>

      </div>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-5"
      >

        {/* Project Name */}
        <div>

          <label className="block text-sm mb-1">
            Project Name
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

        {/* Department */}
        <div>

          <label className="block text-sm mb-1">
            Department
          </label>

          <select
            name="departmentId"
            value={form.departmentId}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          >

            <option value="">
              Select Department
            </option>

            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}

          </select>

        </div>

        {/* BUTTONS */}
        <div className="md:col-span-2 flex justify-end gap-3 pt-3">

          <button
            type="button"
            onClick={() => navigate("/projects")}
            className="bg-gray-200 px-4 py-2 rounded"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700"
          >
            {loading ? "Saving..." : "Save Project"}
          </button>

        </div>

      </form>

    </div>

  );
}
