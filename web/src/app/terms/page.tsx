import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@shortflow/shared";
import { Ext, LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The terms for using ${BRAND.name}.`,
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={
        <p>
          These terms are an agreement between you and {BRAND.name} about your use of the {BRAND.name} website and app (the “Service”). By creating an account or using
          the Service you accept them. If you don&apos;t agree, please don&apos;t use the Service.
        </p>
      }
      sections={[
        {
          id: "service",
          title: "The Service",
          body: (
            <p>
              {BRAND.name} lets you upload long videos, cut them into vertical Shorts, add banners, and publish them to YouTube channels you connect, on a schedule you
              set. Features may change as the Service improves. The Service is currently offered free of charge as a beta.
            </p>
          ),
        },
        {
          id: "youtube",
          title: "YouTube",
          body: (
            <>
              <p>
                {BRAND.name} uses YouTube API Services. <strong className="text-text">By using {BRAND.name} you agree to be bound by the{" "}
                <Ext href="https://www.youtube.com/t/terms">YouTube Terms of Service</Ext></strong>, and Google&apos;s use of your data is covered by the{" "}
                <Ext href="https://policies.google.com/privacy">Google Privacy Policy</Ext>.
              </p>
              <p>
                Every Short you publish must follow YouTube&apos;s{" "}
                <Ext href="https://www.youtube.com/howyoutubeworks/policies/community-guidelines/">Community Guidelines</Ext>. {BRAND.name} is not affiliated with or
                endorsed by YouTube or Google.
              </p>
            </>
          ),
        },
        {
          id: "account",
          title: "Your account",
          body: (
            <ul>
              <li>You must be at least 13 years old, and old enough to use YouTube where you live.</li>
              <li>Keep your sign-in secure. You are responsible for what happens under your account.</li>
              <li>Only connect YouTube channels you own or are authorised to manage.</li>
            </ul>
          ),
        },
        {
          id: "content",
          title: "Your content",
          body: (
            <>
              <p>
                You keep all rights to the videos, images and text you upload. You give {BRAND.name} permission to store, process and transmit that content only as
                needed to provide the Service — for example, to cut your video into Shorts and upload them to your channel.
              </p>
              <p>You promise that you own or have permission to use everything you upload, and that it doesn&apos;t break the law or anyone else&apos;s rights.</p>
            </>
          ),
        },
        {
          id: "acceptable-use",
          title: "Acceptable use",
          body: (
            <>
              <p>Don&apos;t use the Service to:</p>
              <ul>
                <li>upload content you don&apos;t have the rights to, or that infringes copyright or trademarks;</li>
                <li>post spam, misleading or repetitive content, or anything against YouTube&apos;s policies;</li>
                <li>publish to channels you aren&apos;t authorised to manage;</li>
                <li>get around the Service&apos;s limits, use it through automated means, or disrupt it for other users;</li>
                <li>reverse engineer, resell or copy the Service.</li>
              </ul>
              <p>We may remove content or suspend accounts that break these rules.</p>
            </>
          ),
        },
        {
          id: "limits",
          title: "Fair-use limits",
          body: (
            <p>
              Everyone shares the YouTube upload allowance Google gives {BRAND.name}, so each account may publish a limited number of Shorts per day, and we may set limits
              on storage and video size. Shorts over a limit wait and publish automatically when it resets. Limits may change.
            </p>
          ),
        },
        {
          id: "availability",
          title: "Availability and disclaimer",
          body: (
            <p>
              The Service is provided “as is” and “as available”. We work to keep it running, but we don&apos;t guarantee that it will be uninterrupted or error-free, that
              every Short will publish at its exact time, or that YouTube will accept every upload. Keep your own copies of your original videos.
            </p>
          ),
        },
        {
          id: "liability",
          title: "Limitation of liability",
          body: (
            <p>
              To the extent the law allows, {BRAND.name} is not liable for indirect or consequential losses, lost profits or revenue, lost data, or actions YouTube takes on
              your channel, arising from your use of the Service.
            </p>
          ),
        },
        {
          id: "ending",
          title: "Ending your use",
          body: (
            <p>
              You can stop using the Service and delete your account at any time from Settings → Your data. We may suspend or end access for accounts that break these
              terms. When an account is deleted, its data is deleted as described in the{" "}
              <Link href="/privacy" className="text-accent hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          ),
        },
        {
          id: "changes",
          title: "Changes",
          body: <p>We may update these terms. We will change the date at the top and tell you in the app before significant changes take effect. Continuing to use the Service after that means you accept them.</p>,
        },
        {
          id: "law",
          title: "Governing law",
          body: <p>These terms are governed by the laws of India, and disputes are subject to the courts of Tamil Nadu, India.</p>,
        },
        {
          id: "contact",
          title: "Contact",
          body: (
            <p>
              Questions about these terms: <Ext href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</Ext>.
            </p>
          ),
        },
      ]}
    />
  );
}
