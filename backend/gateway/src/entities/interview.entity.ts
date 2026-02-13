import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn } from 'typeorm';
import { Tenant } from './tenant.entity';
import { Message } from './message.entity';

@Entity('interviews')
export class Interview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.interviews)
  tenant: Tenant;

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

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Message, (message) => message.interview)
  messages: Message[];
}
