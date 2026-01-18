import React from 'react';
import { createGamePages } from '../../../../shared-core/pages/createGamePages';

const pages = createGamePages('mines');

export function AboutPage() {
  return <pages.About />;
}

export function PrivacyPage() {
  return <pages.Privacy />;
}

export function TermsPage() {
  return <pages.Terms />;
}

export function ResponsibleGamblingPage() {
  return <pages.ResponsibleGambling />;
}

export function ContactPage() {
  return <pages.Contact />;
}

export default {
  AboutPage,
  PrivacyPage,
  TermsPage,
  ResponsibleGamblingPage,
  ContactPage
};
