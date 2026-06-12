import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

const footerLinks = {
  shop: [
    { label: 'Semua Produk', href: '/products' },
    { label: 'Produk Terbaru', href: '/products?sort=newest' },
    { label: 'Terlaris', href: '/products?sort=popular' },
    { label: 'Promo', href: '/products?on_sale=true' },
  ],
  account: [
    { label: 'Wishlist', href: '/wishlist' },
    { label: 'Keranjang', href: '/cart' },
    { label: 'Pesanan Saya', href: '/orders' },
    { label: 'Profil', href: '/profile' },
  ],
  support: [
    { label: 'Chat CS', href: '/chat' },
    { label: 'Lacak Pesanan', href: '/orders' },
    { label: 'Pembayaran', href: '/payment' },
  ],
} as const;

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-background">
      <div className="container mx-auto px-4 py-10">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div className="max-w-sm">
            <Link href="/" className="text-xl font-bold tracking-tight">
              STORE
            </Link>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Platform belanja untuk menemukan produk, menyimpan wishlist, dan
              mengelola pesanan dari satu akun.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <FooterLinkGroup title="Belanja" links={footerLinks.shop} />
            <FooterLinkGroup title="Akun" links={footerLinks.account} />
            <FooterLinkGroup title="Bantuan" links={footerLinks.support} />
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col gap-2 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} STORE. All rights reserved.</span>
          <span>Support tersedia melalui Chat CS di akun Anda.</span>
        </div>
      </div>
    </footer>
  );
}

interface FooterLinkGroupProps {
  title: string;
  links: readonly {
    label: string;
    href: string;
  }[];
}

function FooterLinkGroup({ title, links }: FooterLinkGroupProps) {
  return (
    <div>
      <h4 className="mb-4 text-sm font-semibold">{title}</h4>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              prefetch={false}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
