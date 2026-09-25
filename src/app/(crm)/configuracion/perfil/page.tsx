import * as A from '@/lib/crm/actions'
import { requireMember } from '@/lib/auth/member'
import { AvatarUploader } from '@/components/crm/settings-parts'
import { InlineForm, SubmitButton } from '@/components/crm/ui'

export default async function ProfilePage() {
  const member = await requireMember()
  return <>
    <article className="panel settings-section">
      <h2>Perfil</h2><p>Así te ve el equipo en el CRM: en el menú, en las tareas y en la actividad.</p>
      <AvatarUploader name={member.name} avatar={member.avatar} />
      <InlineForm action={A.updateProfile} className="settings-form" resetOnSuccess={false}>
        <label>Nombre<input name="name" required defaultValue={member.name} /></label>
        <label>Cargo<input name="title" defaultValue={member.title ?? ''} list="aida-titles" placeholder="Ej.: Diseño" /></label>
        <datalist id="aida-titles"><option value="Dirección" /><option value="Ventas" /><option value="Diseño" /><option value="Desarrollo" /><option value="SEO" /><option value="Contenido" /></datalist>
        <label className="full">Permiso<input value={member.role === 'Administrador' ? 'Administrador (puede invitar, conectar integraciones y exportar datos)' : 'Equipo'} readOnly disabled /></label>
        <label className="full">Correo de la cuenta<input value={member.email} readOnly disabled /></label>
        <div className="form-actions"><SubmitButton>Guardar perfil</SubmitButton></div>
      </InlineForm>
    </article>
    <article className="panel settings-section">
      <h2>Sesión</h2><p>Estás dentro como {member.email}.</p>
      <form action="/logout" method="post"><button className="outline-button">Cerrar sesión</button></form>
    </article>
  </>
}
