import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Interview } from './interview.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Interview, (interview) => interview.messages)
  interview: Interview;

  @Column()
  role: string; // 'assistant' or 'user'

  @Column('text')
  content: string;

  @CreateDateColumn()
  created_at: Date;
}
