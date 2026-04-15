'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
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
import { formatCurrency } from '@/lib/utils';
import { Address } from '@/types';

// Checkout Steps
const STEPS = [
  { id: 1, name: 'Address', icon: MapPin },
  { id: 2, name: 'Shipping', icon: Truck },
  { id: 3, name: 'Payment', icon: CreditCard },
  { id: 4, name: 'Review', icon: ShoppingBag },
];

// Mock shipping options
const SHIPPING_OPTIONS = [
  { 
    id: 'regular', 
    name: 'Regular Shipping', 
    description: '5-7 business days',
    price: 15000,
    icon: '📦'
  },
  { 
    id: 'express', 
    name: 'Express Shipping', 
    description: '2-3 business days',
    price: 35000,
    icon: '🚀'
  },
  { 
    id: 'same-day', 
    name: 'Same Day Delivery', 
    description: 'Today before 9 PM',
    price: 50000,
    icon: '⚡'
  },
];

// Mock payment methods
const PAYMENT_METHODS = [
  { id: 'bank-transfer', name: 'Bank Transfer', description: 'BCA, Mandiri, BNI, BRI' },
  { id: 'e-wallet', name: 'E-Wallet', description: 'GoPay, OVO, DANA, ShopeePay' },
  { id: 'credit-card', name: 'Credit Card', description: 'Visa, Mastercard, JCB' },
  { id: 'cod', name: 'Cash on Delivery', description: 'Pay when package arrives' },
];

// Mock addresses for demo
const MOCK_ADDRESSES: Address[] = [
  {
    id: '1',
    user_id: '1',
    label: 'Home',
    recipient_name: 'John Doe',
    phone: '+62 812 3456 7890',
    street_address: 'Jl. Sudirman No. 123',
    address_line2: 'Apartment Tower A, Unit 15B',
    city: 'Jakarta Selatan',
    province: 'DKI Jakarta',
    postal_code: '12190',
    country: 'Indonesia',
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    user_id: '1',
    label: 'Office',
    recipient_name: 'John Doe',
    phone: '+62 812 3456 7890',
    street_address: 'Menara BCA, Lt. 25',
    address_line2: 'Jl. MH Thamrin No. 1',
    city: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    postal_code: '10310',
    country: 'Indonesia',
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { cart, getCartTotal, clearCart } = useCartStore();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [addresses, setAddresses] = useState<Address[]>(MOCK_ADDRESSES);
  const [selectedAddress, setSelectedAddress] = useState<string>(MOCK_ADDRESSES[0]?.id || '');
  const [selectedShipping, setSelectedShipping] = useState<string>('regular');
  const [selectedPayment, setSelectedPayment] = useState<string>('bank-transfer');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  
  // New address form state
  const [newAddress, setNewAddress] = useState({
    label: '',
    recipient_name: '',
    phone: '',
    street_address: '',
    address_line2: '',
    city: '',
    province: '',
    postal_code: '',
    country: 'Indonesia',
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

  // Calculate totals
  const subtotal = getCartTotal();
  const shippingCost = SHIPPING_OPTIONS.find(s => s.id === selectedShipping)?.price || 0;
  const total = subtotal + shippingCost - promoDiscount;

  // Apply promo code
  const handleApplyPromo = async () => {
    if (!promoCode) return;
    
    setIsApplyingPromo(true);
    // Mock promo code application
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (promoCode.toUpperCase() === 'SAVE10') {
      setPromoDiscount(subtotal * 0.1);
    } else if (promoCode.toUpperCase() === 'FLAT20K') {
      setPromoDiscount(20000);
    } else {
      alert('Invalid promo code');
    }
    setIsApplyingPromo(false);
  };

  // Handle step navigation
  const nextStep = () => {
    if (currentStep < STEPS.length) {
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
      case 3:
        return selectedPayment !== '';
      case 4:
        return agreedToTerms;
      default:
        return true;
    }
  };

  // Handle order submission
  const handlePlaceOrder = async () => {
    if (!canProceed()) return;
    
    setIsProcessing(true);
    
    try {
      // Mock order creation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Clear cart and redirect to success page
      clearCart();
      router.push('/orders?success=true');
    } catch {
      alert('Failed to place order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Add new address
  const handleAddAddress = () => {
    const address: Address = {
      id: Date.now().toString(),
      user_id: user?.id || '1',
      ...newAddress,
      is_default: addresses.length === 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    setAddresses([...addresses, address]);
    setSelectedAddress(address.id);
    setShowAddressForm(false);
    setNewAddress({
      label: '',
      recipient_name: '',
      phone: '',
      street_address: '',
      address_line2: '',
      city: '',
      province: '',
      postal_code: '',
      country: 'Indonesia',
    });
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
                onClick={() => setShowAddressForm(!showAddressForm)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New
              </Button>
            </div>

            {/* Address Form */}
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
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Label</Label>
                          <Input
                            placeholder="e.g., Home, Office"
                            value={newAddress.label}
                            onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Recipient Name</Label>
                          <Input
                            placeholder="Full name"
                            value={newAddress.recipient_name}
                            onChange={(e) => setNewAddress({ ...newAddress, recipient_name: e.target.value })}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input
                          placeholder="+62 xxx xxxx xxxx"
                          value={newAddress.phone}
                          onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Address Line 1</Label>
                        <Input
                          placeholder="Street address"
                          value={newAddress.street_address}
                          onChange={(e) => setNewAddress({ ...newAddress, street_address: e.target.value })}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Address Line 2 (Optional)</Label>
                        <Input
                          placeholder="Apartment, suite, etc."
                          value={newAddress.address_line2}
                          onChange={(e) => setNewAddress({ ...newAddress, address_line2: e.target.value })}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>City</Label>
                          <Input
                            placeholder="City"
                            value={newAddress.city}
                            onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Province</Label>
                          <Input
                            placeholder="Province"
                            value={newAddress.province}
                            onChange={(e) => setNewAddress({ ...newAddress, province: e.target.value })}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Postal Code</Label>
                          <Input
                            placeholder="Postal code"
                            value={newAddress.postal_code}
                            onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Country</Label>
                          <Input
                            value={newAddress.country}
                            onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value })}
                          />
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-4">
                        <Button onClick={handleAddAddress}>Save Address</Button>
                        <Button variant="outline" onClick={() => setShowAddressForm(false)}>
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Address List */}
            <RadioGroup value={selectedAddress} onValueChange={(value) => setSelectedAddress(String(value))}>
              <div className="space-y-4">
                {addresses.map((address) => (
                  <motion.div
                    key={address.id}
                    whileHover={{ scale: 1.01 }}
                    className={`relative p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedAddress === address.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedAddress(address.id)}
                  >
                    <div className="flex items-start gap-4">
                      <RadioGroupItem value={address.id} id={address.id} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{address.label}</span>
                          {address.is_default && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">{address.recipient_name}</p>
                        <p className="text-sm text-muted-foreground">{address.phone}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {address.street_address}
                          {address.address_line2 && `, ${address.address_line2}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {address.city}, {address.province} {address.postal_code}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </RadioGroup>
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
            <h2 className="text-xl font-semibold">Shipping Method</h2>
            
            <RadioGroup value={selectedShipping} onValueChange={(value) => setSelectedShipping(String(value))}>
              <div className="space-y-4">
                {SHIPPING_OPTIONS.map((option) => (
                  <motion.div
                    key={option.id}
                    whileHover={{ scale: 1.01 }}
                    className={`relative p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedShipping === option.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedShipping(option.id)}
                  >
                    <div className="flex items-center gap-4">
                      <RadioGroupItem value={option.id} id={option.id} />
                      <span className="text-2xl">{option.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium">{option.name}</p>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                      <p className="font-semibold">{formatCurrency(option.price)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </RadioGroup>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="payment"
            variants={stepVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <h2 className="text-xl font-semibold">Payment Method</h2>
            
            <RadioGroup value={selectedPayment} onValueChange={(value) => setSelectedPayment(String(value))}>
              <div className="space-y-4">
                {PAYMENT_METHODS.map((method) => (
                  <motion.div
                    key={method.id}
                    whileHover={{ scale: 1.01 }}
                    className={`relative p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedPayment === method.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedPayment(method.id)}
                  >
                    <div className="flex items-center gap-4">
                      <RadioGroupItem value={method.id} id={method.id} />
                      <div className="flex-1">
                        <p className="font-medium">{method.name}</p>
                        <p className="text-sm text-muted-foreground">{method.description}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </RadioGroup>

            {/* Promo Code */}
            <div className="pt-6">
              <h3 className="font-medium mb-4">Promo Code</h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="max-w-xs"
                />
                <Button 
                  variant="outline" 
                  onClick={handleApplyPromo}
                  disabled={isApplyingPromo || !promoCode}
                >
                  {isApplyingPromo ? 'Applying...' : 'Apply'}
                </Button>
              </div>
              {promoDiscount > 0 && (
                <p className="text-sm text-green-600 mt-2">
                  Promo applied: -{formatCurrency(promoDiscount)}
                </p>
              )}
            </div>
          </motion.div>
        );

      case 4:
        const selectedAddr = addresses.find(a => a.id === selectedAddress);
        const selectedShip = SHIPPING_OPTIONS.find(s => s.id === selectedShipping);
        const selectedPay = PAYMENT_METHODS.find(p => p.id === selectedPayment);
        
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
                  <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)}>
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
                  <Button variant="ghost" size="sm" onClick={() => setCurrentStep(2)}>
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedShip && (
                  <div className="flex items-center gap-2 text-sm">
                    <span>{selectedShip.icon}</span>
                    <span>{selectedShip.name}</span>
                    <span className="text-muted-foreground">({selectedShip.description})</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Summary */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Payment Method</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentStep(3)}>
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedPay && (
                  <div className="text-sm">
                    <p>{selectedPay.name}</p>
                    <p className="text-muted-foreground">{selectedPay.description}</p>
                  </div>
                )}
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
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                    currentStep >= step.id
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
                  className={`ml-2 text-sm font-medium hidden sm:block ${
                    currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {step.name}
                </span>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-12 sm:w-24 h-0.5 mx-2 sm:mx-4 ${
                      currentStep > step.id ? 'bg-primary' : 'bg-muted'
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
                  Next
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
                        {formatCurrency((item.product?.sale_price || item.product?.regular_price || 0) * item.quantity)}
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
