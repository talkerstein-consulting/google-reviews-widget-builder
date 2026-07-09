import { EmbedClient } from "@/components/EmbedClient";

type EmbedPageProps = {
  searchParams: Promise<{
    config?: string;
  }>;
};

export default async function EmbedPage({ searchParams }: EmbedPageProps) {
  const params = await searchParams;

  return <EmbedClient encodedConfig={params.config || ""} />;
}
