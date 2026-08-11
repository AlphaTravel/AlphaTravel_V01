import { PageHeader } from "@/components/page-header";
import { OrganizationSettingsForm } from "@/components/organization-settings-form";
import { getOrganizationSettings } from "@/lib/settings-data";

export default async function SettingsPage() {
  const data = await getOrganizationSettings();
  if (!data) return <><PageHeader eyebrow="Workspace" title="Impostazioni" description="Impossibile caricare le impostazioni correnti." /><div className="form-error form-error-block">Dati dell’organizzazione non disponibili.</div></>;
  return (
    <>
      <PageHeader eyebrow="Workspace" title="Impostazioni" description="Nome, fuso orario e valuta del tuo ufficio." />
      <div className="settings-simple">
        <OrganizationSettingsForm organization={data.organization} canManage={data.canManage} />
      </div>
    </>
  );
}
