import AdminHeader from "@/components/AdminHeader";

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <AdminHeader />
      <main className="flex-grow container mx-auto py-6 px-4">{children}</main>
      <footer className="bg-gray-800 text-white py-4 text-center text-sm">
        <div className="container mx-auto">
          © {new Date().getFullYear()} Fashion Show Event Admin
        </div>
      </footer>
    </div>
  );
}
