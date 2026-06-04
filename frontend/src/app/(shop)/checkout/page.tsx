'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';
import { useCheckoutAuth } from '@/hooks/useCheckoutAuth';
import { useCheckoutAddresses } from '@/hooks/useCheckoutAddresses';
import { useCheckoutShipping } from '@/hooks/useCheckoutShipping';
import { useCheckoutPromo } from '@/hooks/useCheckoutPromo';
import { useCheckoutSteps } from '@/hooks/useCheckoutSteps';
import { useCheckoutOrder } from '@/hooks/useCheckoutOrder';
import {
  CheckoutSteps,
  AddressStepContent,
  ShippingStepContent,
  ReviewStepContent,
  OrderSummary,
  CheckoutNavigation,
} from '@/components/checkout';

export default function CheckoutPage() {
  const { user } = useAuthStore();
  const { cart, getCartTotal } = useCartStore();
  const [agreedToTerms, setAgreedToTerms] = React.useState(false);

  // Custom hooks for state & logic
  useCheckoutAuth();
  const addressManager = useCheckoutAddresses();
  const shippingManager = useCheckoutShipping();
  const promoManager = useCheckoutPromo();
  const stepsManager = useCheckoutSteps();
  const orderManager = useCheckoutOrder();

  // Initialize data on first visit
  React.useEffect(() => {
    addressManager.loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (stepsManager.currentStep === 2 && shippingManager.shippingMethods.length === 0) {
      shippingManager.loadShippingMethods();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepsManager.currentStep]);

  // Calculations
  const subtotal = getCartTotal();
  const shippingCost = shippingManager.getShippingCost();

  const selectedAddress = addressManager.addresses.find((a) => a.id === addressManager.selectedAddress);
  const selectedShippingMethod = shippingManager.getSelectedMethod();

  const canProceed = stepsManager.canProceed(
    stepsManager.currentStep,
    addressManager.selectedAddress,
    shippingManager.selectedShipping
  );

  // Handlers
  const handleApplyPromo = async (): Promise<void> => {
    const error = await promoManager.applyPromo(subtotal);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Promo code applied!');
    }
  };

  const handleNextStep = (): void => {
    stepsManager.nextStep(addressManager.selectedAddress, shippingManager.selectedShipping);
  };

  const handlePlaceOrder = async (): Promise<void> => {
    if (!canProceed || !user?.email || !agreedToTerms) {
      if (!agreedToTerms) {
        toast.error('Harap setujui Syarat dan Ketentuan');
      }
      return;
    }

    try {
      await orderManager.placeOrder({
        addressId: addressManager.selectedAddress,
        shippingMethod: shippingManager.selectedShipping,
        promoCode: promoManager.promoCode,
        customerEmail: user.email,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal membuat order. Silakan coba lagi.');
    }
  };

  const handleEditAddressFromReview = (): void => {
    stepsManager.markReview();
    stepsManager.goToStep(1);
  };

  const handleEditShippingFromReview = (): void => {
    stepsManager.markReview();
    stepsManager.goToStep(2);
  };

  const handleAddressSave = async (): Promise<void> => {
    try {
      await addressManager.saveAddress();
      toast.success('Alamat berhasil disimpan');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan alamat');
    }
  };

  const handleAddressDelete = async (id: string): Promise<void> => {
    try {
      await addressManager.deleteAddress(id);
      toast.success('Alamat berhasil dihapus');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus alamat');
    }
  };

  // Render step content
  const renderStepContent = (): React.ReactNode => {
    switch (stepsManager.currentStep) {
      case 1:
        return (
          <AddressStepContent
            addresses={addressManager.addresses}
            selectedAddress={addressManager.selectedAddress}
            isLoading={addressManager.isLoadingAddresses}
            error={addressManager.addressError}
            showForm={addressManager.showAddressForm}
            isEditing={!!addressManager.editingAddress}
            formData={addressManager.formData}
            isSaving={addressManager.isSavingAddress}
            deletingAddressId={addressManager.deletingAddressId}
            onSelectedAddressChange={addressManager.setSelectedAddress}
            onShowFormChange={addressManager.setShowAddressForm}
            onFormChange={addressManager.setFormData}
            onSave={handleAddressSave}
            onEdit={addressManager.openEdit}
            onDelete={handleAddressDelete}
            onReload={addressManager.loadAddresses}
          />
        );

      case 2:
        return (
          <ShippingStepContent
            shippingMethods={shippingManager.shippingMethods}
            selectedShipping={shippingManager.selectedShipping}
            isLoading={shippingManager.isLoadingShipping}
            error={shippingManager.shippingError}
            onSelectedShippingChange={shippingManager.setSelectedShipping}
            onReload={shippingManager.loadShippingMethods}
          />
        );

      case 3:
        return (
          <ReviewStepContent
            address={selectedAddress}
            shippingMethod={selectedShippingMethod}
            items={cart?.items || []}
            agreedToTerms={agreedToTerms}
            onAgreedToTermsChange={setAgreedToTerms}
            onEditAddress={handleEditAddressFromReview}
            onEditShipping={handleEditShippingFromReview}
          />
        );

      default:
        return null;
    }
  };

  if (!cart || cart.items.length === 0) {
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
        <CheckoutSteps currentStep={stepsManager.currentStep} totalSteps={stepsManager.TOTAL_STEPS} />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">{renderStepContent()}</AnimatePresence>

            {/* Navigation */}
            <CheckoutNavigation
              currentStep={stepsManager.currentStep}
              totalSteps={stepsManager.TOTAL_STEPS}
              canProceed={canProceed}
              canPlaceOrder={canProceed && agreedToTerms}
              isProcessing={orderManager.isProcessing}
              returnToReview={stepsManager.returnToReview}
              onPrevious={stepsManager.prevStep}
              onNext={handleNextStep}
              onPlace={handlePlaceOrder}
            />
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <OrderSummary
              items={cart?.items || []}
              subtotal={subtotal}
              shippingCost={shippingCost}
              promoCode={promoManager.promoCode}
              promoDiscount={promoManager.promoDiscount}
              isApplyingPromo={promoManager.isApplyingPromo}
              onPromoChange={promoManager.setPromoCode}
              onApplyPromo={handleApplyPromo}
              onRemovePromo={promoManager.removePromo}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
