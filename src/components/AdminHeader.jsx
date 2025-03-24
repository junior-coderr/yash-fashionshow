"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { LogOut, LogIn, User, Menu, X } from "lucide-react";

export default function AdminHeader() {
  const [isClient, setIsClient] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    setIsClient(true);
    
    const checkAdmin = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("adminToken");
        if (!token) {
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }
        
        const response = await fetch("/api/admin/check", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const data = await response.json();
        setIsAdmin(data.isAdmin);
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAdmin();

    // Close mobile menu when screen size changes to desktop
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    setIsAdmin(false);
    router.push("/admin/login");
    setMobileMenuOpen(false);
  };
  
  const handleLogin = () => {
    router.push("/admin/login");
    setMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Close mobile menu after navigation
  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-gradient-to-r from-gray-800 to-gray-900 text-white py-4 px-4 sm:px-6 shadow-lg relative z-50">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/admin" className="text-xl font-bold">
          Admin Dashboard
        </Link>
        
        {/* Mobile menu button */}
        <button 
          className="md:hidden text-white focus:outline-none"
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:block">
          <ul className="flex items-center space-x-6">
            {isAdmin && (
              <>
                <li>
                  <Link 
                    href="/admin/costs" 
                    className="text-gray-200 hover:text-white transition-colors"
                  >
                    Manage Costs
                  </Link>
                </li>
              </>
            )}
            
            {isClient && !isLoading && (
              <li>
                {isAdmin ? (
                  <div className="flex items-center">
                    <span className="text-xs text-green-300 mr-3 hidden sm:inline-block">
                      <User className="inline-block h-3 w-3 mr-1" />
                      Authenticated
                    </span>
                    <button
                      onClick={handleLogout}
                      className="bg-red-600 hover:bg-red-700 text-white py-1.5 px-3 rounded-md text-sm transition-colors flex items-center"
                    >
                      <LogOut className="h-4 w-4 mr-1" />
                      Logout
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleLogin}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded-md text-sm transition-colors flex items-center"
                  >
                    <LogIn className="h-4 w-4 mr-1" />
                    Login
                  </button>
                )}
              </li>
            )}
          </ul>
        </nav>
      </div>

      {/* Mobile Navigation Menu - Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-gray-900 bg-opacity-50 z-40" onClick={toggleMobileMenu}></div>
      )}

      {/* Mobile Navigation Menu */}
      <nav 
        className={`md:hidden absolute top-full left-0 right-0 bg-gray-800 border-t border-gray-700 shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
          mobileMenuOpen ? 'translate-y-0' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <ul className="flex flex-col p-4 space-y-3">
          {isAdmin && (
            <>
              <li>
                <Link 
                  href="/admin" 
                  className="block py-2 px-4 text-gray-200 hover:bg-gray-700 hover:text-white rounded-md transition-colors"
                  onClick={handleNavClick}
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link 
                  href="/admin/costs" 
                  className="block py-2 px-4 text-gray-200 hover:bg-gray-700 hover:text-white rounded-md transition-colors"
                  onClick={handleNavClick}
                >
                  Manage Costs
                </Link>
              </li>
            </>
          )}
          
          {isClient && !isLoading && (
            <li className="pt-2 border-t border-gray-700">
              {isAdmin ? (
                <div className="p-2">
                  <div className="flex items-center mb-3">
                    <User className="h-4 w-4 text-green-300 mr-2" />
                    <span className="text-sm text-green-300">Authenticated as Admin</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md text-sm transition-colors flex items-center justify-center"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </button>
                </div>
              ) : (
                <div className="p-2">
                  <button
                    onClick={handleLogin}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm transition-colors flex items-center justify-center"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Login
                  </button>
                </div>
              )}
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
}
