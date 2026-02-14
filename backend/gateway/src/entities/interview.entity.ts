import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, JoinColumn } from 'typeorm';
import { Tenant } from './tenant.entity';
import { Message } from './message.entity';

@Entity('interviews')
export class Interview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.interviews)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column()
  tenant_id: string;

  @Column()
  candidate_name: string;

  @Column({ nullable: true })
  cv_url: string;

  @Column({ default: 'pending' })
  status: string; // pending, active, completed

  @Column({ type: 'jsonb', nullable: true })
  rubric: any;

  @Column({ nullable: true })
  report_url: string;

  @Column({ unique: true, nullable: true })
  access_token: string;

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Message, (message) => message.interview)
  messages: Message[];
}
