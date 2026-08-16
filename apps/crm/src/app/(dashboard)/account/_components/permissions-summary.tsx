import { Badge } from '@crm/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@crm/ui';

type RoleSummary = {
  id: string;
  key: string;
  name: string;
  description?: string;
};

type PermissionItem = {
  key: string;
  label: string;
  group: string;
};

export function PermissionsSummary({
  roles,
  directPermissionKeys,
  effectiveKeys,
  permissionsByGroup,
}: {
  roles: RoleSummary[];
  directPermissionKeys: string[];
  effectiveKeys: string[];
  permissionsByGroup: Record<string, PermissionItem[]>;
}) {
  const effectiveSet = new Set(effectiveKeys);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Szerepkörök</CardTitle>
          <CardDescription>Hozzárendelt szerepkörök (csak olvasható)</CardDescription>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nincs szerepkör hozzárendelve.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {roles.map((role) => (
                <li key={role.id}>
                  <Badge variant="secondary">{role.name}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {directPermissionKeys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Közvetlen jogosultságok</CardTitle>
            <CardDescription>Admin által egyénileg adott jogok</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-2">
              {directPermissionKeys.map((key) => (
                <li key={key}>
                  <Badge variant="outline">{key}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Érvényes jogosultságok</CardTitle>
          <CardDescription>Szerepkörök és közvetlen jogok összesítve</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {Object.entries(permissionsByGroup).map(([group, perms]) => {
            const active = perms.filter((p) => effectiveSet.has(p.key));
            if (active.length === 0) return null;
            return (
              <div key={group}>
                <h3 className="mb-2 text-sm font-medium capitalize">{group}</h3>
                <ul className="flex flex-wrap gap-2">
                  {active.map((p) => (
                    <li key={p.key}>
                      <Badge variant="secondary">{p.label}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
