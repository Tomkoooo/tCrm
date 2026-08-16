import { AbstractRepository } from './base';
import { Permission, type IPermission } from '../models/Permission';
import { Role, type IRole } from '../models/Role';
import { User, type IUser } from '../models/User';

export class PermissionRepository extends AbstractRepository<IPermission> {
  constructor() {
    super(Permission);
  }

  async findByKey(key: string): Promise<IPermission | null> {
    return this.findOne({ key });
  }
}

export class RoleRepository extends AbstractRepository<IRole> {
  constructor() {
    super(Role);
  }

  async findByKey(key: string): Promise<IRole | null> {
    return this.findOne({ key });
  }

  async findWithPermissions(): Promise<IRole[]> {
    return Role.find().populate('permissionIds').exec();
  }
}

export class UserRepository extends AbstractRepository<IUser> {
  constructor() {
    super(User);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return this.findOne({ email: email.toLowerCase() });
  }

  async findWithRoles(id: string): Promise<IUser | null> {
    return User.findById(id).populate('roleIds').exec();
  }
}

export { AbstractRepository };
