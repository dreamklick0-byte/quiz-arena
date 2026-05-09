"use client";

import { useState, useEffect } from "react";
import { PageShell } from "@/app/components/PageShell";
import Link from "next/link";

interface Admin {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
}

export default function ManageAdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    role: "admin"
  });

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const res = await fetch("/api/admin/list-admins");
        const data = await res.json();
        if (data.success) {
          setAdmins(data.admins);
        }
      } catch (err) {
        console.error("Failed to fetch admins:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdmins();
  }, []);

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password: pass }));
    setGeneratedPassword(pass);
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/create-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        fetchAdmins();
        alert(`Admin created! Share this password with them: ${formData.password}`);
        setFormData({ username: "", password: "", fullName: "", email: "", role: "admin" });
        setGeneratedPassword("");
      } else {
        alert(data.error || "Failed to create admin");
      }
    } catch (err) {
      console.error("Error creating admin:", err);
    }
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    try {
      const res = await fetch("/api/admin/update-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedAdmin.id,
          fullName: formData.fullName,
          email: formData.email,
          role: formData.role
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowEditModal(false);
        fetchAdmins();
      } else {
        alert(data.error || "Failed to update admin");
      }
    } catch (err) {
      console.error("Error updating admin:", err);
    }
  };

  const toggleStatus = async (admin: Admin) => {
    const newStatus = !admin.is_active;
    if (!confirm(`Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} ${admin.username}?`)) return;

    try {
      const res = await fetch("/api/admin/deactivate-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: admin.id, is_active: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        fetchAdmins();
      } else {
        alert(data.error || "Failed to update status");
      }
    } catch (err) {
      console.error("Error toggling status:", err);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedAdmin.id, newPassword: formData.password })
      });
      const data = await res.json();
      if (data.success) {
        setShowResetModal(false);
        alert(`Password reset! Share this new password: ${formData.password}`);
        setFormData({ ...formData, password: "" });
      } else {
        alert(data.error || "Failed to reset password");
      }
    } catch (err) {
      console.error("Error resetting password:", err);
    }
  };

  return (
    <PageShell overlay="rgba(15,15,26,0.95)">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-zinc-500 hover:text-white transition">← Back</Link>
              <h1 className="text-4xl font-black text-white tracking-tight">👥 MANAGE ADMINS</h1>
            </div>
            <p className="mt-2 text-[#7c3aed] font-bold uppercase tracking-widest text-xs">Super Admin Control</p>
          </div>
          <button
            onClick={() => {
              setFormData({ username: "", password: "", fullName: "", email: "", role: "admin" });
              setShowCreateModal(true);
            }}
            className="rounded-2xl bg-[#7c3aed] px-6 py-3 text-sm font-black text-white transition hover:bg-[#6d28d9] shadow-lg shadow-[#7c3aed]/20"
          >
            + Create New Admin
          </button>
        </div>

        <div className="mt-12 overflow-hidden rounded-3xl border border-white/10 bg-[#161627]/80 backdrop-blur-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500">Username</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500">Name</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500">Role</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500">Status</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-500">Loading admins...</td></tr>
              ) : admins.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-500">No admins found.</td></tr>
              ) : admins.map(admin => (
                <tr key={admin.id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="px-6 py-4 font-medium text-white">{admin.username}</td>
                  <td className="px-6 py-4 text-zinc-300">{admin.full_name}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                      admin.role === 'super_admin' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                    }`}>
                      {admin.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1.5 text-xs font-bold ${admin.is_active ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {admin.is_active ? 'Active ✅' : 'Inactive ❌'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button 
                      onClick={() => {
                        setSelectedAdmin(admin);
                        setFormData(prev => ({ ...prev, fullName: admin.full_name, email: admin.email || "", role: admin.role }));
                        setShowEditModal(true);
                      }}
                      className="text-xs font-bold text-zinc-400 hover:text-white transition"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => toggleStatus(admin)}
                      className={`text-xs font-bold transition ${admin.is_active ? 'text-rose-400 hover:text-rose-300' : 'text-emerald-400 hover:text-emerald-300'}`}
                    >
                      {admin.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedAdmin(admin);
                        setFormData(prev => ({ ...prev, password: "" }));
                        setShowResetModal(true);
                      }}
                      className="text-xs font-bold text-amber-400 hover:text-amber-300 transition"
                    >
                      Reset Password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#161627] p-8 shadow-2xl">
              <h2 className="text-2xl font-black text-white tracking-tight">Create New Admin</h2>
              <form onSubmit={handleCreateAdmin} className="mt-6 space-y-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-[#7c3aed] focus:outline-none"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Username</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={e => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-[#7c3aed] focus:outline-none"
                    placeholder="john_admin"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Email (Optional)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-[#7c3aed] focus:outline-none"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Password</label>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      required
                      value={formData.password}
                      onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-[#7c3aed] focus:outline-none"
                      placeholder="Enter or generate"
                    />
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="shrink-0 rounded-2xl bg-white/5 px-4 py-3 text-xs font-black text-white hover:bg-white/10 transition"
                    >
                      Generate
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Role</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-[#7c3aed] focus:outline-none"
                  >
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                <div className="mt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 rounded-2xl bg-white/5 px-6 py-4 text-sm font-black text-zinc-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-2xl bg-[#7c3aed] px-6 py-4 text-sm font-black text-white hover:bg-[#6d28d9] transition shadow-lg shadow-[#7c3aed]/20"
                  >
                    Create Admin
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#161627] p-8 shadow-2xl">
              <h2 className="text-2xl font-black text-white tracking-tight">Edit Admin: {selectedAdmin.username}</h2>
              <form onSubmit={handleUpdateAdmin} className="mt-6 space-y-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-[#7c3aed] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Email (Optional)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-[#7c3aed] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Role</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-[#7c3aed] focus:outline-none"
                  >
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                <div className="mt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 rounded-2xl bg-white/5 px-6 py-4 text-sm font-black text-zinc-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-2xl bg-[#7c3aed] px-6 py-4 text-sm font-black text-white hover:bg-[#6d28d9] transition"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reset Modal */}
        {showResetModal && selectedAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#161627] p-8 shadow-2xl">
              <h2 className="text-2xl font-black text-white tracking-tight">Reset Password: {selectedAdmin.username}</h2>
              <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500">New Password</label>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      required
                      value={formData.password}
                      onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-[#7c3aed] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="shrink-0 rounded-2xl bg-white/5 px-4 py-3 text-xs font-black text-white hover:bg-white/10 transition"
                    >
                      Generate
                    </button>
                  </div>
                </div>
                <div className="mt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="flex-1 rounded-2xl bg-white/5 px-6 py-4 text-sm font-black text-zinc-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-2xl bg-amber-500 px-6 py-4 text-sm font-black text-white hover:bg-amber-600 transition"
                  >
                    Reset Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
