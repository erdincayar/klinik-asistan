import OnboardingWidget from "@/components/onboarding/OnboardingWidget";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <OnboardingWidget />
    </>
  );
}
