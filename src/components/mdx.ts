// MDX 本文で import なしに使えるコンポーネント（インタラクティブ部品は client: 指定が必要なので各 MDX で import する）
import Choice from './Choice.astro';
import Definition from './Definition.astro';
import Example from './Example.astro';
import Exercise from './Exercise.astro';
import Explain from './Explain.astro';
import Idea from './Idea.astro';
import Note from './Note.astro';
import Pitfall from './Pitfall.astro';
import Proof from './Proof.astro';
import Quiz from './Quiz.astro';
import Reveal from './Reveal.astro';
import Theorem from './Theorem.astro';

export const mdxComponents = { Choice, Definition, Example, Exercise, Explain, Idea, Note, Pitfall, Proof, Quiz, Reveal, Theorem };
