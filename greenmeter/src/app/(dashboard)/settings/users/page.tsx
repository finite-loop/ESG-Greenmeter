"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/Modal";

interface UserEntry {
  userId: string;
  name: string;
  email: string;
  role: string;
  departmentId: string | null;
  status: string;
  lastLogin: string | null;
  createdAt: string;
}

interface UserListResponse {
  data: UserEntry[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}

type UserRole = "admin" | "analyst" | "department" | "viewer";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  analyst: "Analyst",
  department: "Department",
  viewer: "Viewer",
};

const ROLE_BADGE_VARIANT: Record<string, "teal" | "info" | "warning" | "neutral"> = {
  admin: "teal",
  analyst: "info",
  department: "warning",
  viewer: "neutral",
};

const STATUS_BADGE_VARIANT: Record<string, "success" | "warning" | "error"> = {
  active: "success",
  invited: "warning",
  deactivated: "error",
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [meta, setMeta] = useState<{ page: number; pageSize: number; total: number }>({
    page: 1,
    pageSize: 20,
    total: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  // Filter state
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    name: "",
    role: "viewer" as UserRole,
    departmentId: "",
  });

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<UserEntry | null>(null);
  const [editForm, setEditForm] = useState({
    role: "" as string,
    active: true,
    departmentId: "" as string,
    activeChanged: false,
  });

  const abortRef = useRef<AbortController | null>(null);

  const fetchUsers = useCallback(async (page: number, search?: string, role?: string, status?: string) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", "20");
      if (search) params.set("search", search);
      if (role) params.set("role", role);
      if (status) params.set("status", status);

      const res = await fetch(`/api/users?${params.toString()}`, { signal: controller.signal });

      if (res.status === 401 || res.status === 403) {
        setUnauthorized(true);
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.message ?? `Request failed with status ${res.status}`);
        return;
      }

      const json: UserListResponse = await res.json();
      setUsers(json.data);
      setMeta(json.meta);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleApplyFilters() {
    fetchUsers(1, searchInput || undefined, roleFilter || undefined, statusFilter || undefined);
  }

  function handleClearFilters() {
    setSearchInput("");
    setRoleFilter("");
    setStatusFilter("");
    fetchUsers(1);
  }

  function handlePageChange(newPage: number) {
    fetchUsers(newPage, searchInput || undefined, roleFilter || undefined, statusFilter || undefined);
  }

  // Invite handlers
  function openInviteModal() {
    setInviteForm({ email: "", name: "", role: "viewer", departmentId: "" });
    setInviteError(null);
    setInviteOpen(true);
  }

  async function handleInviteSubmit() {
    setInviteLoading(true);
    setInviteError(null);

    try {
      const payload: Record<string, unknown> = {
        email: inviteForm.email,
        name: inviteForm.name,
        role: inviteForm.role,
      };
      if (inviteForm.role === "department" && inviteForm.departmentId) {
        payload.departmentId = inviteForm.departmentId;
      }

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setInviteError(body?.error?.message ?? "Failed to invite user");
        return;
      }

      setInviteOpen(false);
      fetchUsers(1, searchInput || undefined, roleFilter || undefined, statusFilter || undefined);
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : "Failed to invite user");
    } finally {
      setInviteLoading(false);
    }
  }

  // Edit handlers
  function openEditModal(user: UserEntry) {
    setEditUser(user);
    setEditForm({
      role: user.role,
      active: user.status !== "deactivated",
      departmentId: user.departmentId ?? "",
      activeChanged: false,
    });
    setEditError(null);
    setEditOpen(true);
  }

  async function handleEditSubmit() {
    if (!editUser) return;

    setEditLoading(true);
    setEditError(null);

    try {
      const payload: Record<string, unknown> = {
        role: editForm.role,
      };
      if (editForm.activeChanged) {
        payload.active = editForm.active;
      }
      if (editForm.role === "department" && editForm.departmentId) {
        payload.departmentId = editForm.departmentId;
      }

      const res = await fetch(`/api/users/${editUser.userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setEditError(body?.error?.message ?? "Failed to update user");
        return;
      }

      setEditOpen(false);
      fetchUsers(meta.page, searchInput || undefined, roleFilter || undefined, statusFilter || undefined);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setEditLoading(false);
    }
  }

  const totalPages = Math.ceil(meta.total / (meta.pageSize || 20));

  if (unauthorized) {
    return (
      <div>
        <PageHeader title="User Management" description="Access restricted" />
        <div className="p-4 rounded-lg bg-[var(--redbg)] text-[var(--redtx)] text-xs">
          You do not have permission to manage users. This page is restricted to the Admin role.
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="User Management"
        description="Invite team members and manage roles"
        actions={
          <Button variant="primary" size="sm" onClick={openInviteModal}>
            Invite User
          </Button>
        }
      />

      {/* Filter Controls */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="w-48">
          <Input
            label="Search"
            id="filter-search"
            placeholder="Name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <div className="w-36">
          <label className="block text-[11px] font-semibold text-[var(--tx2)] mb-[5px]">
            Role
          </label>
          <Select
            value={roleFilter}
            onValueChange={(val) => setRoleFilter(val === "__all__" ? "" : val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="analyst">Analyst</SelectItem>
              <SelectItem value="department">Department</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-40">
          <label className="block text-[11px] font-semibold text-[var(--tx2)] mb-[5px]">
            Status
          </label>
          <Select
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val === "__all__" ? "" : val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="invited">Invited</SelectItem>
              <SelectItem value="deactivated">Deactivated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 pb-[13px]">
          <Button variant="primary" size="sm" onClick={handleApplyFilters}>
            Apply
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            Clear
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--redbg)] text-[var(--redtx)] text-xs">
          {error}
        </div>
      )}

      {/* Users Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Login</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-[var(--tx3)]">
                Loading...
              </TableCell>
            </TableRow>
          )}
          {!loading && users.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-[var(--tx3)]">
                No users found
              </TableCell>
            </TableRow>
          )}
          {!loading &&
            users.map((user) => (
              <TableRow key={user.userId}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={ROLE_BADGE_VARIANT[user.role] ?? "neutral"}>
                    {ROLE_LABELS[user.role as UserRole] ?? user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE_VARIANT[user.status] ?? "neutral"}>
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-[var(--tx3)]">
                  {user.lastLogin
                    ? new Date(user.lastLogin).toLocaleDateString()
                    : "Never"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(user)}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-[11px] text-[var(--tx3)]">
            Page {meta.page} of {totalPages} ({meta.total} total users)
          </span>
          <div className="flex gap-1">
            <Button
              variant="secondary"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => handlePageChange(meta.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={meta.page >= totalPages}
              onClick={() => handlePageChange(meta.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      <Modal open={inviteOpen} onOpenChange={setInviteOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Invite User</ModalTitle>
            <ModalDescription>
              Send an invitation to a new team member. They will be able to sign in via OAuth.
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-1">
            <Input
              label="Email"
              id="invite-email"
              type="email"
              placeholder="user@company.com"
              value={inviteForm.email}
              onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              label="Name"
              id="invite-name"
              placeholder="Full name"
              value={inviteForm.name}
              onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))}
            />
            <div className="mb-[13px]">
              <label className="block text-[11px] font-semibold text-[var(--tx2)] mb-[5px]">
                Role
              </label>
              <Select
                value={inviteForm.role}
                onValueChange={(val) => setInviteForm((f) => ({ ...f, role: val as UserRole }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="analyst">Analyst</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {inviteForm.role === "department" && (
              <Input
                label="Department ID"
                id="invite-department"
                placeholder="Org node UUID"
                value={inviteForm.departmentId}
                onChange={(e) =>
                  setInviteForm((f) => ({ ...f, departmentId: e.target.value }))
                }
              />
            )}
          </div>

          {inviteError && (
            <div className="p-2 rounded bg-[var(--redbg)] text-[var(--redtx)] text-xs mt-2">
              {inviteError}
            </div>
          )}

          <ModalFooter>
            <Button variant="ghost" size="sm" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={inviteLoading}
              onClick={handleInviteSubmit}
              disabled={!inviteForm.email || !inviteForm.name}
            >
              Invite
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit User Modal */}
      <Modal open={editOpen} onOpenChange={setEditOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Edit User</ModalTitle>
            <ModalDescription>
              {editUser ? `Update role or status for ${editUser.name}` : ""}
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-1">
            <div className="mb-[13px]">
              <label className="block text-[11px] font-semibold text-[var(--tx2)] mb-[5px]">
                Role
              </label>
              <Select
                value={editForm.role}
                onValueChange={(val) => setEditForm((f) => ({ ...f, role: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="analyst">Analyst</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editForm.role === "department" && (
              <Input
                label="Department ID"
                id="edit-department"
                placeholder="Org node UUID"
                value={editForm.departmentId}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, departmentId: e.target.value }))
                }
              />
            )}
            <div className="mb-[13px]">
              <label className="block text-[11px] font-semibold text-[var(--tx2)] mb-[5px]">
                Status
              </label>
              <Select
                value={editForm.active ? "active" : "deactivated"}
                onValueChange={(val) =>
                  setEditForm((f) => ({ ...f, active: val === "active", activeChanged: true }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="deactivated">Deactivated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {editError && (
            <div className="p-2 rounded bg-[var(--redbg)] text-[var(--redtx)] text-xs mt-2">
              {editError}
            </div>
          )}

          <ModalFooter>
            <Button variant="ghost" size="sm" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={editLoading}
              onClick={handleEditSubmit}
            >
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
