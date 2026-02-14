import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Interview } from './interview.entity';
import { User } from './user.entity';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Interview, (interview) => interview.tenant)
  interviews: Interview[];

  @OneToMany(() => User, (user) => user.tenant)
  users: User[];
}
