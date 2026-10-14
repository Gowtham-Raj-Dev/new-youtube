import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@shortflow/shared";
import { Ext, LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${BRAND.name} collects, uses, stores and deletes your data, including data from YouTube API Services.`,
};

const mail = <Ext href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</Ext>;

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          {BRAND.name} (“{BRAND.name}”, “we”, “us”) turns long videos into YouTube Shorts and publishes them to channels you connect. This policy explains what we
          collect, why, and how you stay in control. {BRAND.name} uses <strong className="text-text">YouTube API Services</strong>; by connecting a channel you also
          agree to the <Ext href="https://www.youtube.com/t/terms">YouTube Terms of Service</Ext>, and Google&apos;s handling of your data is described in the{" "}
          <Ext href="https://policies.google.com/privacy">Google Privacy Policy</Ext>.
        </p>
      }
      sections={[
        {
          id: "collect",
          title: "What we collect",
          body: (
            <>
              <p>
                <strong className="text-text">Your account.</strong> Your name, email address and profile picture from Google Sign-In (or the name and email you sign up
                with), and when you last signed in.
              </p>
              <p>
                <strong className="text-text">What you upload and create.</strong> The videos you upload, the Shorts cut from them, banner images, the titles,
                descriptions, tags and schedule you set, and your settings.
              </p>
              <p>
                <strong className="text-text">Data from YouTube API Services.</strong> When you connect a channel we receive, through Google&apos;s OAuth sign-in:
              </p>
              <ul>
                <li>the channel&apos;s ID, name, handle, picture and subscriber count;</li>
                <li>the ID, processing status, copyright-check status and visibility of each video {BRAND.name} uploads for you;</li>
                <li>an access token that lets {BRAND.name} act for you within the permissions you granted. It is stored encrypted and never sent to your browser.</li>
              </ul>
              <p>
                We do <strong className="text-text">not</strong> read your existing videos, comments, messages, watch history, or your Google password.
              </p>
              <p>
                <strong className="text-text">Usage data.</strong> Basic, aggregated usage statistics (pages viewed, device and browser type) through Google Analytics for
                Firebase, and server logs used to find and fix errors.
              </p>
            </>
          ),
        },
        {
          id: "use",
          title: "How we use it",
          body: (
            <>
              <p>We use your data only to run the features you use:</p>
              <ul>
                <li>to cut your videos into Shorts and show them to you;</li>
                <li>to upload each Short you queue to your YouTube channel at its scheduled time, with the title, description, tags and visibility you chose;</li>
                <li>to check a Short&apos;s processing and copyright status after upload and, if you turned on “check for copyright first”, switch it to Public;</li>
                <li>to show your channel&apos;s name, picture and subscriber count inside the app;</li>
                <li>to send you in-app notifications about uploads and problems;</li>
                <li>to keep the service secure, enforce fair daily limits, and fix bugs.</li>
              </ul>
              <p>We do not sell your data, use it for advertising, or use YouTube data for any purpose other than providing {BRAND.name} to you.</p>
            </>
          ),
        },
        {
          id: "share",
          title: "Who we share it with",
          body: (
            <>
              <p>We share data only as needed to run the service:</p>
              <ul>
                <li>
                  <strong className="text-text">YouTube / Google</strong> — the Shorts you publish and their details are sent to YouTube through YouTube API Services.
                </li>
                <li>
                  <strong className="text-text">Google Cloud & Firebase</strong> — our hosting, database, file storage, sign-in and analytics provider, which processes data
                  on our behalf.
                </li>
                <li>
                  <strong className="text-text">The law</strong> — if we are legally required to, or to protect the rights and safety of our users.
                </li>
              </ul>
              <p>No other third party receives your data.</p>
            </>
          ),
        },
        {
          id: "cookies",
          title: "Cookies and local storage",
          body: (
            <p>
              {BRAND.name} stores small pieces of information in your browser (cookies, local storage and IndexedDB) to keep you signed in, remember choices such as the
              channel you last used, and, through Google Analytics for Firebase, count visits. Blocking them will sign you out and may stop the app from working.
            </p>
          ),
        },
        {
          id: "storage",
          title: "Storage and security",
          body: (
            <>
              <p>
                Your data is stored on Google Cloud (Firebase) servers. YouTube access tokens are encrypted with AES-256-GCM and can only be read by our servers.
                Database and storage security rules mean only you can read your videos, Shorts and settings.
              </p>
              <p>No system is perfectly secure, but we take reasonable measures to protect your data and will tell you promptly if a breach affects you.</p>
            </>
          ),
        },
        {
          id: "retention",
          title: "How long we keep it",
          body: (
            <ul>
              <li>A Short&apos;s video file is deleted from our storage as soon as it has been published to YouTube; its title and thumbnail stay in your library until you delete them.</li>
              <li>Uploads that never finish are removed automatically within a day.</li>
              <li>Videos, Shorts and banners stay until you delete them, or until you delete your account.</li>
              <li>Channel details are kept while the channel is connected (refresh them any time on the YouTube page), and deleted when you disconnect it.</li>
              <li>When you delete your account, everything above is deleted straight away. Backups and logs are cleared within 30 days.</li>
            </ul>
          ),
        },
        {
          id: "control",
          title: "Your choices and rights",
          body: (
            <>
              <ul>
                <li>
                  <strong className="text-text">Disconnect a channel</strong> on the YouTube page of the app. This revokes our access and deletes the stored token and channel
                  details.
                </li>
                <li>
                  <strong className="text-text">Revoke access from Google</strong> at any time at{" "}
                  <Ext href="https://security.google.com/settings/security/permissions" />.
                </li>
                <li>
                  <strong className="text-text">Delete your account</strong> under Settings → Your data. This revokes YouTube access and deletes your profile, videos,
                  Shorts, banners, schedule and settings. Videos already published to YouTube stay on YouTube — manage them in YouTube Studio.
                </li>
                <li>
                  <strong className="text-text">Access or correct your data</strong>, or ask any question about it, by emailing {mail}.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "children",
          title: "Children",
          body: <p>{BRAND.name} is not meant for children under 13 (or the minimum age to use YouTube where you live), and we do not knowingly collect their data.</p>,
        },
        {
          id: "changes",
          title: "Changes to this policy",
          body: (
            <p>
              If we change this policy we will update the date at the top of this page, and tell you in the app before a significant change takes effect. See also our{" "}
              <Link href="/terms" className="text-accent hover:underline">
                Terms of Service
              </Link>
              .
            </p>
          ),
        },
        {
          id: "contact",
          title: "Contact",
          body: <p>Questions or requests about your privacy: {mail}.</p>,
        },
      ]}
    />
  );
}
