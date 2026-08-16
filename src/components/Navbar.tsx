  
import { useEffect, useState } from "react";
import {
  Link,
  useLocation,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import logo from "@/assets/Logo(Circular).png";
import { useScrollProgress, useTheme } from "@/lib/site";
import { useAuth } from "@/hooks/use-auth";
import { getCart } from "@/lib/cart.functions";

const NAV = [
  { id: "home", label: "Home" },
  { id: "categories", label: "Categories" },
  { id: "products", label: "Products" },
  { id: "care", label: "Plant Care" },
  { id: "gallery", label: "Gallery" },
  { id: "about", label: "About Us" },
  { id: "contact", label: "Contact" },
];

export function Navbar() {
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("home");

  const progress = useScrollProgress();
  const { dark, toggle } = useTheme();

  const { user, signOut } = useAuth();

  const fetchCart = useServerFn(getCart);

  const { data: cart } = useQuery({
    queryKey: ["cart"],
    queryFn: () => fetchCart(),
    enabled: !!user,
  });

  const isHomePage =
    location.pathname === "/";

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 30);

      if (!isHomePage) {
        setActive("");
        return;
      }

      let current = "home";

      for (const item of NAV) {
        const el =
          document.getElementById(
            item.id,
          );

        if (
          el &&
          el.getBoundingClientRect()
            .top <= 120
        ) {
          current = item.id;
        }
      }

      setActive(current);
    };

    window.addEventListener(
      "scroll",
      onScroll,
      { passive: true },
    );

    onScroll();

    return () =>
      window.removeEventListener(
        "scroll",
        onScroll,
      );
  }, [isHomePage]);

  const go = (id: string) => {
    setOpen(false);

    if (!isHomePage) {
      window.location.href =
        id === "home"
          ? "/"
          : `/#${id}`;
      return;
    }

    const el =
      document.getElementById(id);

    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  /*
   * HOME PAGE
   * - Top of hero: white
   * - Scrolled: black in light mode
   *
   * OTHER PAGES
   * - Always black in light mode
   *
   * DARK MODE
   * - Always white
   */
  const useWhiteText =
    dark ||
    (isHomePage && !scrolled);

  const navTextClass = useWhiteText
    ? "text-white"
    : "text-black";

  const navHoverClass = useWhiteText
    ? "text-white hover:text-primary"
    : "text-black hover:text-primary";

  return (
    <>
      {/* Scroll progress */}
      <div className="fixed left-0 top-0 z-50 h-1 w-full bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-primary via-primary-glow to-primary transition-[width] duration-150"
          style={{
            width: `${progress}%`,
          }}
        />
      </div>

      <header
        className={`fixed inset-x-0 top-1 z-40 transition-all duration-500 ${
          scrolled || !isHomePage
            ? "py-2"
            : "py-4"
        }`}
      >
        <nav
          className={`mx-auto flex max-w-7xl items-center justify-between rounded-full px-4 transition-all duration-500 sm:px-6 ${
            scrolled || !isHomePage
              ? "glass shadow-[var(--shadow-soft)]"
              : "bg-transparent"
          }`}
        >
          {/* Logo */}
          <button
            onClick={() => go("home")}
            className="flex items-center gap-2 py-3"
            aria-label="Chandra Gardens"
          >
            <img
              src={logo}
              alt="Chandra Gardens"
              className="h-9 w-9 object-contain"
            />

            <span
              className={`font-display text-lg font-semibold leading-none ${navTextClass}`}
            >
              Chandra{" "}
              <span className="gradient-text">
                Gardens
              </span>
            </span>
          </button>

          {/* Desktop navigation */}
          <ul className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => go(n.id)}
                  className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isHomePage &&
                    active === n.id
                      ? "font-semibold text-primary"
                      : navHoverClass
                  }`}
                >
                  {n.label}

                  {isHomePage &&
                    active ===
                      n.id && (
                      <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-primary" />
                    )}
                </button>
              </li>
            ))}
          </ul>

          {/* Right-side actions */}
          <div className="flex items-center gap-2">
            {/* Cart */}
            <Link
              to="/cart"
              aria-label="Cart"
              className={`relative grid h-10 w-10 place-items-center rounded-full border border-border bg-background/50 transition-transform hover:scale-110 ${navTextClass}`}
            >
              <i className="fa-solid fa-cart-shopping text-sm" />

              {!!cart?.count && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {cart.count}
                </span>
              )}
            </Link>

            {/* Orders */}
            {user && (
              <Link
                to="/orders"
                aria-label="My orders"
                className={`hidden h-10 place-items-center rounded-full border border-border bg-background/50 px-4 text-xs font-semibold sm:grid ${navTextClass} hover:text-primary`}
              >
                Orders
              </Link>
            )}

            {/* Authentication */}
            {user ? (
              <button
                onClick={() =>
                  void signOut()
                }
                aria-label="Sign out"
                className={`grid h-10 w-10 place-items-center rounded-full border border-border bg-background/50 ${navTextClass} hover:text-primary`}
              >
                <i className="fa-solid fa-right-from-bracket text-sm" />
              </button>
            ) : (
              <Link
                to="/auth"
                className="grid h-10 place-items-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground transition-transform hover:scale-105"
              >
                Sign in
              </Link>
            )}

            {/* Theme */}
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className={`grid h-10 w-10 place-items-center rounded-full border border-border bg-background/50 transition-transform hover:scale-110 ${navTextClass}`}
            >
              <i
                className={`fa-solid ${
                  dark
                    ? "fa-sun"
                    : "fa-moon"
                } text-sm`}
              />
            </button>

            {/* Mobile menu */}
            <button
              onClick={() =>
                setOpen((o) => !o)
              }
              aria-label="Menu"
              className={`grid h-10 w-10 place-items-center rounded-full border border-border bg-background/50 transition-transform hover:scale-110 lg:hidden ${navTextClass}`}
            >
              <i
                className={`fa-solid ${
                  open
                    ? "fa-xmark"
                    : "fa-bars"
                } text-sm`}
              />
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        <div
          className={`mx-4 mt-2 overflow-hidden rounded-3xl glass transition-all duration-300 lg:hidden ${
            open
              ? "max-h-[700px] opacity-100"
              : "max-h-0 opacity-0"
          }`}
        >
          <ul className="flex flex-col p-3">
            {NAV.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() =>
                    go(n.id)
                  }
                  className={`relative w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition-colors ${
                    isHomePage &&
                    active === n.id
                      ? "font-bold text-primary"
                      : dark
                        ? "text-white hover:text-primary"
                        : "text-black hover:text-primary"
                  }`}
                >
                  {n.label}

                  {isHomePage &&
                    active ===
                      n.id && (
                      <span className="absolute bottom-1 left-4 right-4 h-0.5 rounded-full bg-primary" />
                    )}
                </button>
              </li>
            ))}

            {/* Mobile Cart */}
            <li className="mt-1">
              <Link
                to="/cart"
                onClick={() =>
                  setOpen(false)
                }
                className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium text-black hover:text-primary dark:text-white"
              >
                <span>
                  <i className="fa-solid fa-cart-shopping mr-2" />
                  Cart
                </span>

                {!!cart?.count && (
                  <span className="rounded-full bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">
                    {cart.count}
                  </span>
                )}
              </Link>
            </li>

            {/* Mobile Orders */}
            {user && (
              <li className="mt-1">
                <Link
                  to="/orders"
                  onClick={() =>
                    setOpen(false)
                  }
                  className="block rounded-2xl px-4 py-3 text-sm font-medium text-black hover:text-primary dark:text-white"
                >
                  <i className="fa-solid fa-box mr-2" />
                  Orders
                </Link>
              </li>
            )}

            {/* Mobile Sign in / Sign out */}
            <li className="mt-1">
              {user ? (
                <button
                  onClick={() => {
                    setOpen(false);
                    void signOut();
                  }}
                  className="w-full rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm font-semibold text-black dark:text-white"
                >
                  Sign out
                </button>
              ) : (
                <Link
                  to="/auth"
                  onClick={() =>
                    setOpen(false)
                  }
                  className="block rounded-2xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground"
                >
                  Sign in
                </Link>
              )}
            </li>
          </ul>
        </div>
      </header>
    </>
  );
}
