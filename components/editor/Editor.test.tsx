// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DESIGN } from '@/lib/editor/design';
import { SAMPLE_FACTS } from '@/components/cards';
import { EXPORTS_KEY } from '@/lib/data';
import { Editor } from './Editor';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const user = { id: 'u1', name: 'Mira Kato', image: null, plan: 'free' as const, githubLogin: 'mkato' };
const features = { auth: true, storage: false, video: false, billing: false, social: false };

beforeAll(() => {
  // jsdom has neither; the canvas fit effect and CardScaler need them.
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('fetch', vi.fn(async (url: string) =>
    url.startsWith('/api/pr?')
      ? new Response(JSON.stringify(SAMPLE_FACTS), { status: 200, headers: { 'content-type': 'application/json', 'x-pr-cache': 'miss' } })
      : new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })));
});

afterEach(() => { cleanup(); localStorage.clear(); }); // vitest runs without globals, so RTL's auto-cleanup is not registered

const save = (getByText: (t: string) => HTMLElement) => getByText('Save').closest('button')!;

describe('<Editor />', () => {
  it('renders the sample card and locks export until a PR is imported', async () => {
    const { getByLabelText, getByText, container } = render(
      <Editor user={user} features={features} initialDesign={DEFAULT_DESIGN} initialFacts={null} />,
    );
    expect(container.querySelector('.ed-header')).toBeTruthy();
    expect(container.querySelector('.ed-canvas')).toBeTruthy();
    // The stage is never empty: the sample card renders behind the import prompt.
    expect(getByText('Stream diff hunks lazily in the review pane')).toBeTruthy();
    expect(getByLabelText('Pull request URL')).toBeTruthy();
    // Nothing of the sample PR may be exported or recorded.
    expect(save(getByText).disabled).toBe(true);
    expect(save(getByText).title).toBe('Import a pull request first');
    expect(getByText('Copy').closest('button')?.disabled).toBe(true);
    expect(getByText('Remove').closest('button')?.disabled).toBe(true);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/pr/recent'));
  });

  it('renders the card family for imported facts', () => {
    const { container, getByText } = render(
      <Editor user={user} features={features} initialDesign={DEFAULT_DESIGN} initialFacts={SAMPLE_FACTS} />,
    );
    expect(container.querySelector('.pc-midnight.pc-standard')).toBeTruthy();
    expect(getByText(SAMPLE_FACTS.title)).toBeTruthy();
    expect(container.querySelector('.bf-url')?.textContent).toBe('github.com/acme/review-pane/pull/4821');
    expect(save(getByText).disabled).toBe(false);
  });

  it('imports a pasted pull-request link through /api/pr and unlocks export', async () => {
    const { getByLabelText, getByText } = render(
      <Editor user={user} features={features} initialDesign={DEFAULT_DESIGN} initialFacts={null} />,
    );
    const input = getByLabelText('Pull request URL');
    fireEvent.change(input, { target: { value: 'https://github.com/acme/review-pane/pull/4821' } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => expect(getByText('Imported review-pane #4821')).toBeTruthy());
    expect(fetch).toHaveBeenCalledWith('/api/pr?owner=acme&repo=review-pane&number=4821');
    expect(save(getByText).disabled).toBe(false);
  });

  it('offers all seven families as tiles and every format; switching family keeps a non-overridden format on the default layout', async () => {
    const { getByLabelText, getByRole, container } = render(<Editor user={user} features={features} initialDesign={{ ...DEFAULT_DESIGN, cardFormat: 'digest' }} initialFacts={SAMPLE_FACTS} />);
    for (const label of ['Midnight', 'Industrial', 'Modern', 'Minimal', 'Futuristic', 'Terminal', 'Editorial']) expect(getByLabelText(label)).toBeTruthy();
    fireEvent.click(getByLabelText('Terminal'));
    await waitFor(() => expect(container.querySelector('.pc-terminal.pc-digest')).toBeTruthy());
    expect(container.querySelector('.pc-missing')).toBeNull();
    const select = getByRole('combobox', { name: /format/i }) as HTMLSelectElement;
    expect([...select.options].every((o) => !o.disabled)).toBe(true);
    fireEvent.change(select, { target: { value: 'queue-row' } });
    await waitFor(() => expect(container.querySelector('.pc-terminal.pc-queue-row')).toBeTruthy());
  });

  it('undoes a design change on ctrl/cmd+Z', () => {
    const { getByText } = render(
      <Editor user={user} features={features} initialDesign={DEFAULT_DESIGN} initialFacts={SAMPLE_FACTS} />,
    );
    fireEvent.click(getByText('BG'));
    const crimson = () => getByText('Crimson').closest('button')!;
    fireEvent.click(crimson());
    expect(crimson().dataset.selected).toBe('true');
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(crimson().dataset.selected).toBeUndefined();
    expect(getByText('Ember').closest('button')!.dataset.selected).toBe('true');
  });

  it('never records a video export: MP4/GIF are disabled and the timeline only explains phase 4', () => {
    const { getByText, getAllByText } = render(
      <Editor user={user} features={features} initialDesign={{ ...DEFAULT_DESIGN, clips: ['fadeIn'] }} initialFacts={SAMPLE_FACTS} />,
    );
    fireEvent.click(save(getByText));
    for (const fmt of ['MP4', 'GIF']) {
      const btn = getAllByText(fmt).map((n) => n.closest('button')!).find((b) => b.getAttribute('role') === 'tab')!;
      expect(btn.disabled).toBe(true);
      expect(btn.title).toBe('Video rendering lands in phase 4');
      fireEvent.click(btn);
    }
    // Selection never leaves an image format, so Export cannot be asked for a file that does not exist.
    expect(getByText(/Export PNG/)).toBeTruthy();
    // The one reachable video affordance says so and writes nothing.
    fireEvent.click(getByText('Export Video').closest('button')!);
    expect(getByText('Video rendering lands in phase 4')).toBeTruthy();
    expect(localStorage.getItem(EXPORTS_KEY)).toBeNull();
  });
});
