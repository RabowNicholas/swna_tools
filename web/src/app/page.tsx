"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Heart, Star, ExternalLink, Globe } from "lucide-react";
import { useClientContext } from "@/contexts/ClientContext";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Typography, TextHierarchy } from "@/components/ui/Typography";
import { VStack, HStack, Spacer } from "@/components/ui/Spacing";
import {
  AnimatedContainer,
  StaggeredContainer,
  InteractiveCard,
  animations,
} from "@/components/ui/Animations";

interface Tool {
  name: string;
  description: string;
  href: string;
  id: string;
}

export default function Home() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [hasMounted, setHasMounted] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    setHasMounted(true);
    const savedFavorites = localStorage.getItem("swna-favorites");
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  // Save favorites to localStorage whenever it changes (only after mount)
  useEffect(() => {
    if (hasMounted) {
      localStorage.setItem("swna-favorites", JSON.stringify(favorites));
    }
  }, [favorites, hasMounted]);

  const toggleFavorite = (toolId: string) => {
    setFavorites((prev) =>
      prev.includes(toolId)
        ? prev.filter((id) => id !== toolId)
        : [...prev, toolId]
    );
  };

  const allTools: Tool[] = [
    // Forms
    {
      id: "ee3",
      name: "EE-3 Form",
      description: "",
      href: "/forms/ee3",
    },
    {
      id: "ee1",
      name: "EE-1 Form",
      description: "",
      href: "/forms/ee1",
    },
    {
      id: "ee1a",
      name: "EE-1a Form",
      description: "",
      href: "/forms/ee1a",
    },
    {
      id: "ee10",
      name: "EE-10 Form",
      description: "",
      href: "/forms/ee10",
    },
    {
      id: "en16",
      name: "EN-16 Form",
      description: "",
      href: "/forms/en16",
    },
    // DOL Letters
    {
      id: "withdrawal",
      name: "Withdrawal Letter",
      description: "",
      href: "/forms/withdrawal",
    },
    {
      id: "address-change",
      name: "Address Change Letter",
      description: "",
      href: "/forms/address-change",
    },
    {
      id: "ir-notice",
      name: "IR Notice La Plata",
      description: "",
      href: "/forms/ir-notice",
    },
    // Medical
    {
      id: "desert-pulm",
      name: "Desert Pulmonary Referral",
      description: "",
      href: "/forms/desert-pulm",
    },
    // Billing
    {
      id: "invoice",
      name: "Invoice Generator",
      description: "",
      href: "/forms/invoice",
    },
    // Client Management
    {
      id: "clients",
      name: "Client Manager",
      description: "",
      href: "/clients",
    },
    // Analytics
    {
      id: "pipeline",
      name: "Claims Pipeline Dashboard",
      description: "Management view - identify bottlenecks and prioritize follow-ups by responsibility",
      href: "/pipeline",
    },
    // Portal Access
    {
      id: "portal",
      name: "DOL Portal Access",
      description: "",
      href: "/portal",
    },
  ];

  const toolCategories = {
    forms: allTools.filter((tool) =>
      ["ee3", "ee1", "ee1a", "ee10", "en16"].includes(tool.id)
    ),
    dolLetters: allTools.filter((tool) =>
      ["withdrawal", "address-change", "ir-notice"].includes(tool.id)
    ),
    medical: allTools.filter((tool) => ["desert-pulm"].includes(tool.id)),
    billing: allTools.filter((tool) => ["invoice"].includes(tool.id)),
    analytics: allTools.filter((tool) => ["pipeline"].includes(tool.id)),
    clientManagement: allTools.filter((tool) =>
      ["clients", "portal"].includes(tool.id)
    ),
    portalAccess: allTools.filter((tool) => ["portal"].includes(tool.id)),
  };

  const favoriteTools = hasMounted
    ? allTools.filter((tool) => favorites.includes(tool.id))
    : [];

  const ToolCard = ({
    tool,
    showFavoriteButton = true,
  }: {
    tool: Tool;
    showFavoriteButton?: boolean;
  }) => {
    const isFavorite = hasMounted && favorites.includes(tool.id);

    return (
      <InteractiveCard
        className="h-full relative group"
        glowColor="rgba(59,130,246,0.2)"
      >
        <Card
          hover
          className="h-full bg-card border-2 border-border hover:border-primary hover:bg-accent/30 shadow-sm hover:shadow-md relative group"
        >
          {showFavoriteButton && hasMounted && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                toggleFavorite(tool.id);
              }}
              className={`absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 p-1 h-8 w-8 ${animations.hoverScale}`}
              aria-label={
                isFavorite
                  ? `Remove ${tool.name} from favorites`
                  : `Add ${tool.name} to favorites`
              }
            >
              {isFavorite ? (
                <svg
                  className="h-4 w-4 text-destructive"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              ) : (
                <Heart className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              )}
            </Button>
          )}

          <Link href={tool.href} className="block">
            <CardContent>
              <VStack size="sm">
                <TextHierarchy.CardTitle className="group-hover:text-primary transition-colors pr-8">
                  {tool.name}
                </TextHierarchy.CardTitle>
                <Typography.Body size="small" className="line-clamp-2">
                  {tool.description}
                </Typography.Body>
              </VStack>
            </CardContent>
          </Link>
        </Card>
      </InteractiveCard>
    );
  };

  return (
    <div className="space-y-8">
      {/* Skip link for accessibility */}
      <a href="#main-content" className="skip-link" tabIndex={0}>
        Skip to main content
      </a>

      {/* Header */}
      <AnimatedContainer animation="fadeIn" delay={100}>
        <header className="text-center">
          <TextHierarchy.PageTitle>SWNA Tools</TextHierarchy.PageTitle>
        </header>
      </AnimatedContainer>

      {/* Main content */}
      <main id="main-content" className="space-y-12">
        {/* Favorites Section */}
        {hasMounted && favoriteTools.length > 0 && (
          <AnimatedContainer animation="fadeIn" delay={300} trigger="inView">
            <section aria-labelledby="favorites-heading">
              <VStack size="lg" className="mb-6">
                <HStack size="sm" className="justify-start">
                  <Star className="h-6 w-6 text-warning fill-warning" />
                  <TextHierarchy.SectionTitle id="favorites-heading">
                    Your Favorites
                  </TextHierarchy.SectionTitle>
                </HStack>
                <Typography.Body className="text-muted-foreground">
                  Quick access to your most frequently used tools
                </Typography.Body>
              </VStack>

              <StaggeredContainer
                staggerDelay={100}
                baseAnimation="slideInFromLeft"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {favoriteTools.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    showFavoriteButton={false}
                  />
                ))}
              </StaggeredContainer>
            </section>
          </AnimatedContainer>
        )}

        {/* Empty favorites state */}
        {hasMounted && favoriteTools.length === 0 && (
          <section
            aria-labelledby="favorites-empty-heading"
            className="text-center py-8"
          >
            <div className="max-w-md mx-auto">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2
                id="favorites-empty-heading"
                className="text-lg font-semibold text-foreground mb-2"
              >
                No favorites yet
              </h2>
              <p className="text-sm text-muted-foreground">
                Click the heart icon on any tool below to add it to your
                favorites for quick access.
              </p>
            </div>
          </section>
        )}

        {/* Forms Section */}
        <AnimatedContainer animation="fadeIn" trigger="inView">
          <section aria-labelledby="forms-heading">
            <VStack size="lg" className="mb-6">
              <TextHierarchy.SectionTitle id="forms-heading">
                Forms
              </TextHierarchy.SectionTitle>
              <Typography.Body className="text-muted-foreground">
                Employment and legal forms for case documentation
              </Typography.Body>
            </VStack>

            <StaggeredContainer
              staggerDelay={80}
              baseAnimation="slideInFromBottom"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {toolCategories.forms.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </StaggeredContainer>
          </section>
        </AnimatedContainer>

        {/* DOL Letters Section */}
        <AnimatedContainer animation="fadeIn" trigger="inView">
          <section aria-labelledby="dol-letters-heading">
            <div className="mb-6">
              <h2
                id="dol-letters-heading"
                className="text-2xl font-bold text-foreground mb-2"
              >
                DOL Letters
              </h2>
              <p className="text-muted-foreground">
                Department of Labor correspondence and notifications
              </p>
            </div>

            <StaggeredContainer
              staggerDelay={80}
              baseAnimation="slideInFromRight"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {toolCategories.dolLetters.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </StaggeredContainer>
          </section>
        </AnimatedContainer>

        {/* Medical Section */}
        <AnimatedContainer animation="fadeIn" trigger="inView">
          <section aria-labelledby="medical-heading">
            <div className="mb-6">
              <h2
                id="medical-heading"
                className="text-2xl font-bold text-foreground mb-2"
              >
                Medical
              </h2>
              <p className="text-muted-foreground">
                Medical referrals and healthcare documentation
              </p>
            </div>

            <StaggeredContainer
              staggerDelay={80}
              baseAnimation="slideInFromLeft"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {toolCategories.medical.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </StaggeredContainer>
          </section>
        </AnimatedContainer>

        {/* Billing Section */}
        <AnimatedContainer animation="fadeIn" trigger="inView">
          <section aria-labelledby="billing-heading">
            <div className="mb-6">
              <h2
                id="billing-heading"
                className="text-2xl font-bold text-foreground mb-2"
              >
                Billing
              </h2>
              <p className="text-muted-foreground">
                Invoice generation and billing management
              </p>
            </div>

            <StaggeredContainer
              staggerDelay={80}
              baseAnimation="slideInFromBottom"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {toolCategories.billing.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </StaggeredContainer>
          </section>
        </AnimatedContainer>

        {/* Analytics Section */}
        <AnimatedContainer animation="fadeIn" trigger="inView">
          <section aria-labelledby="analytics-heading">
            <div className="mb-6">
              <h2
                id="analytics-heading"
                className="text-2xl font-bold text-foreground mb-2"
              >
                Analytics & Reporting
              </h2>
              <p className="text-muted-foreground">
                Visualizations and insights into your claims pipeline
              </p>
            </div>

            <StaggeredContainer
              staggerDelay={80}
              baseAnimation="slideInFromLeft"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {toolCategories.analytics.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </StaggeredContainer>
          </section>
        </AnimatedContainer>

        {/* Client Management Section */}
        <AnimatedContainer animation="fadeIn" trigger="inView">
          <section aria-labelledby="client-management-heading">
            <div className="mb-6">
              <h2
                id="client-management-heading"
                className="text-2xl font-bold text-foreground mb-2"
              >
                Client Management
              </h2>
              <p className="text-muted-foreground">
                Client data management and organization tools
              </p>
            </div>

            <StaggeredContainer
              staggerDelay={80}
              baseAnimation="slideInFromRight"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {toolCategories.clientManagement.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </StaggeredContainer>
          </section>
        </AnimatedContainer>
      </main>
    </div>
  );
}
