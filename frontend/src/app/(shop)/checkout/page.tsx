'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  MapPin,
  Truck,
  CreditCard,
  ShoppingBag,
  Plus,
  Edit2,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';
import { formatCurrency } from '@/utils';
import { Address } from '@/types';
import { orderService } from '@/services/order';
import { promoService } from '@/services/promo';
import { addressService } from '@/services/address';
import { shippingService, formatEstimate, type ShippingMethod } from '@/services/shipping';

// Checkout Steps
const STEPS = [
  { id: 1, name: 'Address', icon: MapPin },
  { id: 2, name: 'Shipping', icon: Truck },
  { id: 3, name: 'Review', icon: ShoppingBag },
];

// Payment is handled entirely by Midtrans Snap UI — no local selection needed.

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { cart, getCartTotal, clearCart } = useCartStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [selectedShipping, setSelectedShipping] = useState<string>('regular');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);

  // Shipping methods from API
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [isLoadingShipping, setIsLoadingShipping] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [shippingFetched, setShippingFetched] = useState(false);

  // When true: clicking "Next" after editing a step will jump straight back to Review (step 4)
  // instead of proceeding sequentially. Set when user clicks "Edit" from the Review step.
  const [returnToReview, setReturnToReview] = useState(false);

  // Address form state (shared for add & edit)
  const [newAddress, setNewAddress] = useState({
    recipient_name: '',
    phone: '',
    street_address: '',
    address_line2: '',
    city: '',
    province: '',
    postal_code: '',
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/checkout');
    }
  }, [isAuthenticated, router]);

  // Redirect if cart is empty
  useEffect(() => {
    if (!cart || cart.items.length === 0) {
      router.push('/cart');
    }
  }, [cart, router]);

  // Fetch addresses from API on mount
  const loadAddresses = async () => {
    setIsLoadingAddresses(true);
    setAddressError(null);
    try {
      const data = await addressService.getAddresses();
      setAddresses(data);
      // Auto-select default address if none selected yet
      if (!selectedAddress) {
        const defaultAddr = data.find(a => a.is_default);
        if (defaultAddr) setSelectedAddress(defaultAddr.id);
      }
    } catch {
      setAddressError('Gagal memuat alamat. Silakan coba lagi.');
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Fetch shipping methods from API — lazy: only when user reaches step 2
  const loadShippingMethods = async () => {
    setIsLoadingShipping(true);
    setShippingError(null);
    try {
      const data = await shippingService.getMethods();
      setShippingMethods(data);
      setShippingFetched(true);
      // Pre-select first method if none selected yet
      if (!selectedShipping && data.length > 0) {
        setSelectedShipping(data[0].code);
      }
    } catch {
      setShippingError('Gagal memuat opsi pengiriman. Silakan coba lagi.');
    } finally {
      setIsLoadingShipping(false);
    }
  };

  useEffect(() => {
    if (currentStep === 2 && !shippingFetched) {
      loadShippingMethods();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // Calculate totals
  const subtotal = getCartTotal();
  // Use price from selected shipping method object (fallback 0 if not yet loaded)
  const shippingCost = shippingMethods.find(s => s.code === selectedShipping)?.price ?? 0;
  const total = subtotal + shippingCost - promoDiscount;

  // Maps backend promo error messages → friendly Indonesian copy
  const getFriendlyPromoError = (error: unknown): string => {
    const err = error as Error & { code?: string };
    const msg = err?.message?.toLowerCase() ?? '';

    if (msg.includes('already used') || msg.includes('sudah digunakan')) {
      return `Kode promo "${promoCode.toUpperCase()}" sudah pernah Anda gunakan sebelumnya. Silakan gunakan kode promo lain.`;
    }
    if (msg.includes('not found') || msg.includes('invalid') || msg.includes('not valid')) {
      return `Kode promo "${promoCode.toUpperCase()}" tidak ditemukan atau tidak berlaku. Mohon periksa kembali kode yang Anda masukkan.`;
    }
    if (msg.includes('expired')) {
      return `Kode promo "${promoCode.toUpperCase()}" sudah tidak berlaku. Masa berlaku kode ini telah habis.`;
    }
    if (msg.includes('minimum') || msg.includes('min')) {
      return `Total belanja Anda belum memenuhi syarat minimum untuk menggunakan kode promo ini.`;
    }
    if (msg.includes('usage limit') || msg.includes('kuota')) {
      return `Kode promo "${promoCode.toUpperCase()}" telah mencapai batas penggunaan maksimum.`;
    }
    return err?.message || 'Kode promo tidak dapat digunakan. Silakan coba kode lain.';
  };

  // Apply promo code via real API
  const handleApplyPromo = async () => {
    if (!promoCode) return;
    setIsApplyingPromo(true);
    try {
      const result = await promoService.validatePromoCode(promoCode, subtotal);
      setPromoDiscount(result.discount_amount);
    } catch (error) {
      setPromoDiscount(0);
      alert(getFriendlyPromoError(error));
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setPromoCode('');
    setPromoDiscount(0);
  };

  // Handle step navigation
  const nextStep = () => {
    if (returnToReview) {
      // User was editing from Review — jump straight back to Review
      setReturnToReview(false);
      setCurrentStep(4);
    } else if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return selectedAddress !== '';
      case 2:
        return selectedShipping !== '';
      default:
        return true;
    }
  };

  // Load Midtrans Snap.js script once on mount
  useEffect(() => {
    const snapUrl = process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL;
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
    if (!snapUrl || !clientKey) return;
    if (document.querySelector(`script[src="${snapUrl}"]`)) return; // already loaded

    const script = document.createElement('script');
    script.src = snapUrl;
    script.setAttribute('data-client-key', clientKey);
    script.async = true;
    document.head.appendChild(script);

    return () => {
      // Leave script in DOM — removing it would break subsequent navigations
    };
  }, []);

  // Handle order submission
  const handlePlaceOrder = async () => {
    if (!canProceed()) return;
    setIsProcessing(true);

    try {
      const result = await orderService.checkout({
        address_id: selectedAddress,
        shipping_method: selectedShipping,
        payment_method: 'midtrans_snap', // Midtrans Snap UI handles payment method selection
        promo_code: promoCode || undefined,
        customer_email: user?.email ?? '',
        idempotency_key: `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      });

      const orderId = result.order.id;
      const orderNumber = result.order.order_number;

      // If backend returned a Snap token, open Midtrans payment popup
      if (result.snap_token) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const snap = (window as any).snap;
        if (!snap) {
          // Snap.js not yet loaded — fallback to redirect URL
          if (result.redirect_url) window.location.href = result.redirect_url;
          return;
        }

        snap.pay(result.snap_token, {
          onSuccess: () => {
            clearCart();
            router.push(`/orders/${orderId}?payment=success`);
          },
          onPending: () => {
            clearCart();
            router.push(`/orders/${orderId}?payment=pending`);
          },
          onError: () => {
            setIsProcessing(false);
            alert(`Pembayaran untuk order ${orderNumber} gagal. Silakan coba lagi.`);
          },
          onClose: () => {
            // User closed popup without paying — order sudah dibuat, arahkan ke detail order
            setIsProcessing(false);
            router.push(`/orders/${orderId}?payment=cancelled`);
          },
        });
      } else {
        // No Snap token (Midtrans unavailable) — go to order detail
        clearCart();
        router.push(`/orders/${orderId}?success=true`);
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      alert(error instanceof Error ? error.message : 'Gagal membuat order. Silakan coba lagi.');
      setIsProcessing(false);
    }
  };

  // Reset address form
  const resetAddressForm = () => {
    setNewAddress({
      recipient_name: '',
      phone: '',
      street_address: '',
      address_line2: '',
      city: '',
      province: '',
      postal_code: '',
    });
    setEditingAddress(null);
    setShowAddressForm(false);
  };

  // Open edit mode — pre-fill form with selected address data
  const handleOpenEdit = (address: Address) => {
    setEditingAddress(address);
    setNewAddress({
      recipient_name: address.recipient_name,
      phone: address.phone,
      street_address: address.street_address,
      address_line2: address.address_line2 ?? '',
      city: address.city,
      province: address.province,
      postal_code: address.postal_code,
    });
    setShowAddressForm(true);
  };

  // Create address via API
  const handleAddAddress = async () => {
    setIsSavingAddress(true);
    try {
      const created = await addressService.createAddress({
        ...newAddress,
        is_default: addresses.length === 0,
      });
      setAddresses(prev => [...prev, created]);
      setSelectedAddress(created.id);
      resetAddressForm();
    } catch {
      alert('Gagal menyimpan alamat. Silakan coba lagi.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Update address via API
  const handleUpdateAddress = async () => {
    if (!editingAddress) return;
    setIsSavingAddress(true);
    try {
      const updated = await addressService.updateAddress(editingAddress.id, newAddress);
      setAddresses(prev => prev.map(a => a.id === updated.id ? updated : a));
      resetAddressForm();
    } catch {
      alert('Gagal memperbarui alamat. Silakan coba lagi.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Delete address via API
  const handleDeleteAddress = async (id: string) => {
    setDeletingAddressId(id);
    try {
      await addressService.deleteAddress(id);
      setAddresses(prev => prev.filter(a => a.id !== id));
      // If deleted address was selected, reset selection
      if (selectedAddress === id) setSelectedAddress('');
    } catch {
      alert('Gagal menghapus alamat. Silakan coba lagi.');
    } finally {
      setDeletingAddressId(null);
    }
  };

  // Animation variants
  const stepVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="address"
            variants={stepVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Shipping Address</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetAddressForm();
                  setShowAddressForm(prev => !prev);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New
              </Button>
            </div>

            {/* Add / Edit Address Form */}
            <AnimatePresence>
              {showAddressForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      <p className="text-sm font-semibold text-muted-foreground">
                        {editingAddress ? 'Edit Alamat' : 'Tambah Alamat Baru'}
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nama Penerima</Label>
                          <Input
                            placeholder="Nama lengkap"
                            value={newAddress.recipient_name}
                            onChange={(e) => setNewAddress({ ...newAddress, recipient_name: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Nomor Telepon</Label>
                          <Input
                            placeholder="+62 xxx xxxx xxxx"
                            value={newAddress.phone}
                            onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Alamat Lengkap</Label>
                          <Input
                            placeholder="Nama jalan, nomor rumah"
                            value={newAddress.street_address}
                            onChange={(e) => setNewAddress({ ...newAddress, street_address: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Alamat Tambahan (Opsional)</Label>
                          <Input
                            placeholder="Apartemen, RT/RW, patokan, dll."
                            value={newAddress.address_line2}
                            onChange={(e) => setNewAddress({ ...newAddress, address_line2: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Kota</Label>
                          <Input
                            placeholder="Kota"
                            value={newAddress.city}
                            onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Provinsi</Label>
                          <Input
                            placeholder="Provinsi"
                            value={newAddress.province}
                            onChange={(e) => setNewAddress({ ...newAddress, province: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Kode Pos</Label>
                          <Input
                            placeholder="Kode pos"
                            value={newAddress.postal_code}
                            onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={editingAddress ? handleUpdateAddress : handleAddAddress}
                          disabled={isSavingAddress}
                        >
                          {isSavingAddress
                            ? 'Menyimpan...'
                            : editingAddress
                              ? 'Simpan Perubahan'
                              : 'Simpan Alamat'}
                        </Button>
                        <Button variant="outline" onClick={resetAddressForm} disabled={isSavingAddress}>
                          Batal
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Loading Skeleton */}
            {isLoadingAddresses && (
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="p-4 rounded-lg border-2 border-border animate-pulse">
                    <div className="flex items-start gap-4">
                      <div className="h-4 w-4 rounded-full bg-muted mt-1" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-1/3 bg-muted rounded" />
                        <div className="h-3 w-1/4 bg-muted rounded" />
                        <div className="h-3 w-2/3 bg-muted rounded" />
                        <div className="h-3 w-1/2 bg-muted rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {!isLoadingAddresses && addressError && (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-destructive">{addressError}</p>
                <Button variant="outline" size="sm" onClick={loadAddresses}>
                  Coba Lagi
                </Button>
              </div>
            )}

            {/* Address List */}
            {!isLoadingAddresses && !addressError && (
              <>
                {addresses.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                    <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Belum ada alamat tersimpan.</p>
                    <p className="text-xs text-muted-foreground mt-1">Tambahkan alamat pengiriman di atas.</p>
                  </div>
                ) : (
                  <RadioGroup value={selectedAddress} onValueChange={(value) => setSelectedAddress(String(value))}>
                    <div className="space-y-4">
                      {addresses.map((address) => (
                        <motion.div
                          key={address.id}
                          whileHover={{ scale: 1.01 }}
                          className={`relative p-4 rounded-lg border-2 cursor-pointer transition-colors ${selectedAddress === address.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                            }`}
                          onClick={() => setSelectedAddress(address.id)}
                        >
                          <div className="flex items-start gap-4">
                            <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-semibold">{address.recipient_name}</p>
                                {address.is_default && (
                                  <Badge variant="secondary" className="text-xs">Default</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{address.phone}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {address.street_address}
                                {address.address_line2 && `, ${address.address_line2}`}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {address.city}, {address.province} {address.postal_code}
                              </p>
                            </div>
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleOpenEdit(address)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteAddress(address.id)}
                                disabled={deletingAddressId === address.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {deletingAddressId === address.id && (
                            <p className="text-xs text-muted-foreground mt-2 ml-8">Menghapus alamat...</p>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </RadioGroup>
                )}
              </>
            )}
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="shipping"
            variants={stepVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <h2 className="text-xl font-semibold">Metode Pengiriman</h2>

            {/* Loading Skeleton */}
            {isLoadingShipping && (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 rounded-lg border-2 border-border animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="h-4 w-4 rounded-full bg-muted" />
                      <div className="h-8 w-8 rounded bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-1/3 bg-muted rounded" />
                        <div className="h-3 w-1/4 bg-muted rounded" />
                      </div>
                      <div className="h-4 w-16 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {!isLoadingShipping && shippingError && (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-destructive">{shippingError}</p>
                <Button variant="outline" size="sm" onClick={loadShippingMethods}>
                  Coba Lagi
                </Button>
              </div>
            )}

            {/* Shipping Options from DB */}
            {!isLoadingShipping && !shippingError && (
              <RadioGroup value={selectedShipping} onValueChange={(value) => setSelectedShipping(String(value))}>
                <div className="space-y-4">
                  {shippingMethods.map((method) => (
                    <motion.div
                      key={method.code}
                      whileHover={{ scale: 1.01 }}
                      className={`relative p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        selectedShipping === method.code
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedShipping(method.code)}
                    >
                      <div className="flex items-center gap-4">
                        <RadioGroupItem value={method.code} id={`shipping-${method.code}`} />
                        <span className="text-2xl">{method.icon}</span>
                        <div className="flex-1">
                          <p className="font-medium">{method.name}</p>
                          <p className="text-sm text-muted-foreground">{formatEstimate(method)}</p>
                        </div>
                        <p className="font-semibold">{formatCurrency(method.price)}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </RadioGroup>
            )}
          </motion.div>
        );

      case 3:
        const selectedAddr = addresses.find(a => a.id === selectedAddress);
        const selectedShip = shippingMethods.find(s => s.code === selectedShipping);

        return (
          <motion.div
            key="review"
            variants={stepVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <h2 className="text-xl font-semibold">Review Your Order</h2>

            {/* Address Summary */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Shipping Address</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setReturnToReview(true); setCurrentStep(1); }}
                  >
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedAddr && (
                  <div className="text-sm">
                    <p className="font-medium">{selectedAddr.recipient_name}</p>
                    <p className="text-muted-foreground">{selectedAddr.phone}</p>
                    <p className="text-muted-foreground">
                      {selectedAddr.street_address}
                      {selectedAddr.address_line2 && `, ${selectedAddr.address_line2}`}
                    </p>
                    <p className="text-muted-foreground">
                      {selectedAddr.city}, {selectedAddr.province} {selectedAddr.postal_code}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Shipping Summary */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Shipping Method</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setReturnToReview(true); setCurrentStep(2); }}
                  >
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedShip && (
                  <div className="flex items-center gap-2 text-sm">
                    <span>{selectedShip.icon}</span>
                    <span>{selectedShip.name}</span>
                    <span className="text-muted-foreground">({formatEstimate(selectedShip)})</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment info — handled by Midtrans */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  <span>Pilih metode pembayaran di halaman berikutnya (Midtrans Snap)</span>
                </div>
              </CardContent>
            </Card>

            {/* Items Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Order Items ({cart?.items.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cart?.items.map((item) => (
                    <div key={`${item.product_id}-${item.variant_id}`} className="flex gap-4">
                      <div className="relative h-16 w-16 rounded-md overflow-hidden bg-muted">
                        {item.product?.images?.[0] && (
                          <Image
                            src={item.product.images[0].url}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.product?.name}</p>
                        {item.variant && (
                          <p className="text-xs text-muted-foreground">{item.variant.variant_type}: {item.variant.variant_value}</p>
                        )}
                        <p className="text-sm">
                          {formatCurrency(item.product?.sale_price || item.product?.regular_price || 0)} x {item.quantity}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Terms and Conditions */}
            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground">
                I agree to the{' '}
                <Link href="/terms" className="text-primary hover:underline">
                  Terms and Conditions
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </label>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  if (!isAuthenticated || !cart || cart.items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Back to Cart */}
        <Link
          href="/cart"
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Cart
        </Link>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <motion.div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${currentStep >= step.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground/30 text-muted-foreground'
                    }`}
                  animate={{
                    scale: currentStep === step.id ? 1.1 : 1,
                  }}
                >
                  {currentStep > step.id ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </motion.div>
                <span
                  className={`ml-2 text-sm font-medium hidden sm:block ${currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                >
                  {step.name}
                </span>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-12 sm:w-24 h-0.5 mx-2 sm:mx-4 ${currentStep > step.id ? 'bg-primary' : 'bg-muted'
                      }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {renderStepContent()}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {currentStep < STEPS.length ? (
                <Button
                  onClick={nextStep}
                  disabled={!canProceed()}
                >
                  {returnToReview ? 'Save & Back to Review' : 'Next'}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handlePlaceOrder}
                  disabled={!canProceed() || isProcessing}
                  className="min-w-[150px]"
                >
                  {isProcessing ? 'Processing...' : 'Place Order'}
                </Button>
              )}
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items */}
                <div className="space-y-2">
                  {cart.items.slice(0, 3).map((item) => (
                    <div key={`${item.product_id}-${item.variant_id}`} className="flex justify-between text-sm">
                      <span className="text-muted-foreground truncate max-w-[180px]">
                        {item.product?.name} x {item.quantity}
                      </span>
                      <span>
                        {formatCurrency(Number(item.product?.sale_price || item.product?.regular_price || 0) * item.quantity)}
                      </span>
                    </div>
                  ))}
                  {cart.items.length > 3 && (
                    <p className="text-sm text-muted-foreground">
                      +{cart.items.length - 3} more items
                    </p>
                  )}
                </div>

                <Separator />

                {/* Promo Code — single location, always visible */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Promo Code</p>
                  {promoDiscount > 0 ? (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md px-3 py-2">
                      <span className="text-sm text-green-700 font-medium">{promoCode.toUpperCase()} applied</span>
                      <button
                        onClick={handleRemovePromo}
                        className="text-xs text-red-500 hover:text-red-700 ml-2"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Promo code"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                        className="text-sm h-8"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleApplyPromo}
                        disabled={isApplyingPromo || !promoCode}
                        className="shrink-0 h-8"
                      >
                        {isApplyingPromo ? '...' : 'Apply'}
                      </Button>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>{formatCurrency(shippingCost)}</span>
                  </div>
                  {promoDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Promo Discount</span>
                      <span>-{formatCurrency(promoDiscount)}</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-lg">{formatCurrency(total)}</span>
                </div>

                {/* Security Badge */}
                <div className="pt-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    🔒 Secure checkout powered by Midtrans
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
