'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RichTextEditor } from './rich-text-editor';
import { updateMailTemplateAction, type MailTemplateFormState } from '../actions';

type MailTemplateFormProps = {
  template: {
    id: string;
    key: string;
    subject: string;
    body: string;
    description: string;
    variables: string[];
    enabled: boolean;
    recipientRoleKeys: string[];
    recipientUserIds: string[];
    roles: Array<{ key: string; name: string }>;
    users: Array<{ id: string; name: string; email: string }>;
  };
};

export function MailTemplateForm({ template }: MailTemplateFormProps) {
  const router = useRouter();
  const bound = updateMailTemplateAction.bind(null, template.id);
  const [state, action, pending] = useActionState(bound, {
    success: false,
  } satisfies MailTemplateFormState);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message);
      router.refresh();
    } else if (state?.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="font-mono">
          {template.key}
        </Badge>
        <span className="text-muted-foreground text-sm">Rendszerkulcs — nem módosítható</span>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="subject">Tárgy</Label>
        <Input id="subject" name="subject" defaultValue={template.subject} required />
      </div>

      <RichTextEditor
        name="body"
        label="Tartalom (HTML)"
        defaultValue={template.body}
        variables={template.variables}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Leírás (admin)</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={template.description}
          rows={2}
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="enabled" name="enabled" value="true" defaultChecked={template.enabled} />
        <Label htmlFor="enabled">Értesítés engedélyezve (küldés aktív)</Label>
      </div>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold">Extra címzettek (szerepkörök)</h2>
          <p className="text-muted-foreground text-sm">
            Esemény indításakor ezek a szerepkörök is kapnak másolatot.
          </p>
        </div>
        <div className="border-border divide-y rounded-md border">
          {template.roles.map((role) => (
            <label
              key={role.key}
              className="hover:bg-muted/30 flex cursor-pointer items-center gap-3 px-3 py-2"
            >
              <Checkbox
                name="recipientRoleKeys"
                value={role.key}
                defaultChecked={template.recipientRoleKeys.includes(role.key)}
              />
              <span className="text-sm">{role.name}</span>
              <span className="text-muted-foreground font-mono text-xs">{role.key}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold">Extra címzettek (felhasználók)</h2>
        </div>
        <div className="border-border max-h-48 divide-y overflow-y-auto rounded-md border">
          {template.users.map((user) => (
            <label
              key={user.id}
              className="hover:bg-muted/30 flex cursor-pointer items-center gap-3 px-3 py-2"
            >
              <Checkbox
                name="recipientUserIds"
                value={user.id}
                defaultChecked={template.recipientUserIds.includes(user.id)}
              />
              <span className="text-sm">
                {user.name} <span className="text-muted-foreground">({user.email})</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <div className="flex justify-end border-t pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? 'Mentés…' : 'Sablon mentése'}
        </Button>
      </div>
    </form>
  );
}
