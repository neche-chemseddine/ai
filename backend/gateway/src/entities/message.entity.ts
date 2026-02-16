import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { Interview } from './interview.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Interview, (interview) => interview.messages)
  @JoinColumn({ name: 'interview_id' })
  interview: Interview;

  @Column()
  role: string; // 'assistant' or 'user'

  @Column('text')
  content: string;

  @CreateDateColumn()
  created_at: Date;
}
