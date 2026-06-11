"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { createNenFetch } from "@withnen/client";
import { WebNenGuardian } from "./ui/web-nen-guardian";
import { X, MessageCircle, Play, BookOpen, Mail, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "./ui/button";

const nenFetch = createNenFetch('');

interface FeedbackQuestion {
  id: string;
  route: string;
  question: string;
  options: string[];
}

export const QUESTIONS: FeedbackQuestion[] = [
  {
    id: "home",
    route: "/",
    question: "How are you handling payload encryption today?",
    options: [
      "We just rely on TLS",
      "We use mTLS / internal meshes",
      "We built custom E2EE",
      "We don't encrypt payloads yet",
    ],
  },
  {
    id: "docs",
    route: "/docs",
    question: "Are you finding what you need in the docs?",
    options: [
      "Yes, it's crystal clear",
      "I'm looking for API examples",
      "I'm confused by the architecture",
      "Need installation troubleshooting",
    ],
  },
  {
    id: "ai",
    route: "/ai",
    question: "Are you worried about AI prompt leakage?",
    options: [
      "Yes, very worried",
      "Not yet, but we will be",
      "We don't send PII to AI models",
      "We don't use AI APIs yet",
    ],
  },
  {
    id: "pricing",
    route: "/pricing",
    question: "Which plan fits your team best?",
    options: [
      "Open Source is fine",
      "We need Cloud / Audit logs",
      "Enterprise on-premise",
      "Need a custom startup plan",
    ],
  },
  {
    id: "cloudflare",
    route: "/why-not-cloudflare",
    question: "Is our comparison with Cloudflare fair?",
    options: [
      "Yes, makes total sense",
      "No, Cloudflare does more",
      "Still confused on differences",
      "We use both in our stack",
    ],
  },
  {
    id: "performance",
    route: "/performance",
    question: "Are these benchmarks matching your expectations?",
    options: [
      "Yes, extremely fast",
      "I'd need to test locally",
      "How does Wasm affect cold starts?",
      "Need more comparison benchmarks",
    ],
  },
  {
    id: "faq",
    route: "/faq",
    question: "Did this FAQ answer your questions?",
    options: [
      "Yes, found my answers",
      "No, still have doubts",
      "Want to chat with an engineer",
      "Suggesting a new question",
    ],
  },
  {
    id: "general",
    route: "general",
    question: "Did you understand the core concept of Nen?",
    options: [
      "Yes, E2EE makes sense",
      "Still a bit confused",
      "How is this better than Cloudflare?",
      "Ready to build with it",
    ],
  },
];

const getNextQuestionId = (currentPath: string, answered: string[]): string | null => {
  // 1. Identify primary question ID for current pathname
  let primaryId = "general";
  if (currentPath === "/") primaryId = "home";
  else if (currentPath?.startsWith("/docs")) primaryId = "docs";
  else if (currentPath === "/ai") primaryId = "ai";
  else if (currentPath === "/pricing") primaryId = "pricing";
  else if (currentPath === "/why-not-cloudflare") primaryId = "cloudflare";
  else if (currentPath === "/performance") primaryId = "performance";
  else if (currentPath === "/faq") primaryId = "faq";

  // 2. If primary question is not answered, return it
  if (!answered.includes(primaryId)) {
    return primaryId;
  }

  // 3. Otherwise, check all other questions in order
  for (const q of QUESTIONS) {
    if (!answered.includes(q.id)) {
      return q.id;
    }
  }

  // 4. Everything is answered
  return null;
};

export function NenFeedbackWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [answeredIds, setAnsweredIds] = useState<string[]>([]);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [showMenuOverride, setShowMenuOverride] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);

  // Load answered state when route changes
  useEffect(() => {
    try {
      const answered = JSON.parse(
        localStorage.getItem("nen_feedback_answered_v3") || "[]",
      );
      setAnsweredIds(answered);
      const nextQId = getNextQuestionId(pathname, answered);
      setCurrentQuestionId(nextQId);
      setShowMenuOverride(false);
    } catch {
      // ignore
    }
  }, [pathname]);

  const handleAnswer = (questionId: string, optionIndex: number) => {
    // Fire-and-forget encrypted telemetry — never blocks the UI.
    void nenFetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, optionIndex, path: pathname }),
    }).catch(() => {});

    try {
      const answered = JSON.parse(
        localStorage.getItem("nen_feedback_answered_v3") || "[]",
      );
      if (!answered.includes(questionId)) {
        const updated = [...answered, questionId];
        localStorage.setItem(
          "nen_feedback_answered_v3",
          JSON.stringify(updated),
        );
        setAnsweredIds(updated);
        const nextQId = getNextQuestionId(pathname, updated);
        setCurrentQuestionId(nextQId);
      }
    } catch {
      // ignore
    }
  };

  const handleResetFeedback = () => {
    try {
      localStorage.removeItem("nen_feedback_answered_v3");
      setAnsweredIds([]);
      const nextQId = getNextQuestionId(pathname, []);
      setCurrentQuestionId(nextQId);
      setShowMenuOverride(false);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    // Show a small greeting bubble after 3 seconds on a new page, if not already open and questions remain
    const t = setTimeout(() => {
      if (!isOpen && currentQuestionId !== null) {
        setShowGreeting(true);
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [pathname, isOpen, currentQuestionId]);

  const handleOpen = () => {
    setIsOpen(true);
    setShowGreeting(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setShowGreeting(false);
    setShowMenuOverride(false);
  };

  const renderContent = () => {
    const currentQuestion = QUESTIONS.find((q) => q.id === currentQuestionId);

    // If all questions are answered or menu override is active, render redirection menu
    if (!currentQuestion || showMenuOverride) {
      const allDone = answeredIds.length === QUESTIONS.length;
      return (
        <>
          <p className="text-sm font-medium mb-1 text-left">
            {allDone ? "Feedback Completed!" : "Quick Links"}
          </p>
          <p className="text-[11px] text-muted-foreground mb-3 text-left">
            {allDone 
              ? "Thank you for answering all our feedback questions." 
              : "Access quick navigation or finish the survey later."}
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href="/#demo"
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "justify-start text-xs h-9 sm:h-8 gap-2 w-full",
              })}
              onClick={handleClose}
            >
              <Play className="w-3.5 h-3.5 text-primary" />
              <span>Try a Demo</span>
            </Link>
            <Link
              href="/docs"
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "justify-start text-xs h-9 sm:h-8 gap-2 w-full",
              })}
              onClick={handleClose}
            >
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              <span>Read the Documentation</span>
            </Link>
            <a
              href="mailto:hello@withnen.com"
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "justify-start text-xs h-9 sm:h-8 gap-2 w-full",
              })}
              onClick={handleClose}
            >
              <Mail className="w-3.5 h-3.5 text-primary" />
              <span>Contact Us</span>
            </a>
          </div>
          <div className="mt-3 pt-2 border-t border-border/40 flex justify-between items-center text-[10px] text-muted-foreground">
            <span>{answeredIds.length}/{QUESTIONS.length} answered</span>
            <button
              onClick={handleResetFeedback}
              className="hover:text-primary transition-colors flex items-center gap-1 font-medium"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              Reset all
            </button>
          </div>
        </>
      );
    }

    // Render current question card
    return (
      <>
        <p className="text-sm font-medium mb-3 text-left leading-snug">
          {currentQuestion.question}
        </p>
        <div className="flex flex-col gap-2">
          {currentQuestion.options.map((opt, i) => (
            <Button
              key={opt}
              size="sm"
              variant="outline"
              className="justify-start text-xs h-auto py-1.5 sm:h-7 hover:bg-primary/10 hover:text-primary transition-colors text-left whitespace-normal w-full"
              onClick={() => handleAnswer(currentQuestion.id, i)}
            >
              {opt}
            </Button>
          ))}
        </div>
        <div className="mt-3 pt-2 border-t border-border/40 flex justify-between items-center text-[10px] text-muted-foreground">
          <span>{answeredIds.length + 1} of {QUESTIONS.length}</span>
          <button
            onClick={() => setShowMenuOverride(true)}
            className="hover:text-primary transition-colors font-medium"
          >
            Skip to menu
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="fixed bottom-3 right-3 sm:right-6 sm:bottom-6 z-50 flex flex-col items-end gap-2 sm:gap-3 pointer-events-none" style={{ touchAction: 'manipulation' }}>
      {isOpen && (
        <div className="relative bg-background border border-border/60 shadow-lg rounded-2xl p-4 w-[260px] mb-2 sm:mb-8 animate-in slide-in-from-bottom-2 fade-in duration-200 pointer-events-auto" style={{ touchAction: 'manipulation' }}>
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          {renderContent()}
        </div>
      )}

      {/* Greeting Bubble */}
      {!isOpen && showGreeting && (
        <div
          className="relative bg-background border border-border/60 shadow-md rounded-xl py-2 px-3 mb-2 sm:mb-8 cursor-pointer hover:bg-muted/50 transition-colors animate-in slide-in-from-bottom-2 fade-in duration-300 pointer-events-auto"
          style={{ touchAction: 'manipulation' }}
          onClick={handleOpen}
        >
          <p className="text-xs font-medium whitespace-nowrap">Need a hand?</p>
        </div>
      )}

      {/* Nen Guardian Toggle */}
      <button
        type="button"
        onClick={isOpen ? handleClose : handleOpen}
        onTouchEnd={(e) => { e.preventDefault(); (isOpen ? handleClose : handleOpen)(); }}
        className="relative group transition-transform hover:scale-110 active:scale-95 outline-none pointer-events-auto flex items-center justify-center cursor-pointer"
        style={{ touchAction: 'manipulation' }}
        aria-label="Toggle Nen Feedback"
      >
        <WebNenGuardian
          pixel={5}
          state={isOpen ? "alert" : "idle"}
          aura={true}
          className="transition-opacity group-hover:opacity-90"
        />
        {!isOpen && !showGreeting && (
          <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <MessageCircle className="w-3 h-3" />
          </div>
        )}
      </button>
    </div>
  );
}
