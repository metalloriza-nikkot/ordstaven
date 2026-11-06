// Namnkontrollen före push (beslut 42.3 och 43.3), prövad i ett eget provrepo med ett påhittat namn.
// Namnet och mönstret här är påhittade. De riktiga står bara i ~/.config/ordstaven/ på den dator som pushar.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KROK = fileURLToPath(new URL('../../verktyg/git-krokar/pre-push', import.meta.url));

describe('namnkontrollen före push', () => {
  /** @type {string} */ let rot;
  /** @type {string} */ let hem;
  /** @type {string} */ let repo;
  const env = () => ({ ...process.env, HOME: hem, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: join(hem, '.gitconfig') });
  const git = (...a) => execFileSync('git', a, { cwd: repo, env: env(), encoding: 'utf8' });
  const push = () => spawnSync('git', ['push', '-q', 'origin', 'HEAD:main'], { cwd: repo, env: env(), encoding: 'utf8' });
  const commit = (fil, text, msg = 'Ny fil') => { writeFileSync(join(repo, fil), text); git('add', fil); git('commit', '-q', '-m', msg); };

  beforeEach(() => {
    rot = mkdtempSync(join(tmpdir(), 'namnkrok-'));
    hem = join(rot, 'hem'); mkdirSync(join(hem, '.config', 'ordstaven'), { recursive: true });
    writeFileSync(join(hem, '.gitconfig'), '[user]\n\tname = Provare\n\temail = prov@example.invalid\n[init]\n\tdefaultBranch = main\n');
    writeFileSync(join(hem, '.config', 'ordstaven', 'namn'), '# påhittat\nOllibo\n');
    writeFileSync(join(hem, '.config', 'ordstaven', 'monster'), 'hemlig\\s+klass\n');
    execFileSync('git', ['init', '-q', '--bare', join(rot, 'fjarr.git')], { env: env(), stdio: 'pipe' });
    repo = join(rot, 'repo');
    execFileSync('git', ['clone', '-q', join(rot, 'fjarr.git'), repo], { env: env(), stdio: 'pipe' });
    mkdirSync(join(repo, 'krokar'));
    copyFileSync(KROK, join(repo, 'krokar', 'pre-push')); chmodSync(join(repo, 'krokar', 'pre-push'), 0o755);
    git('config', 'core.hooksPath', 'krokar');
    commit('a.txt', 'Spelaren går in i skogen.\n');
  });
  afterEach(() => rmSync(rot, { recursive: true, force: true }));

  it('släpper igenom en push utan namn', () => {
    const r = push();
    expect(r.status, r.stderr).toBe(0);
    expect(r.stderr).toMatch(/Namnkontrollen: 1 commits utan namn/);
  });
  it('stoppar ett namn i en fil, också böjt och med stor bokstav, och visar var', () => {
    push();
    commit('b.json', '{"anteckning": "OLLIBOS fråga i köket"}\n');
    const r = push();
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/b\.json: .*OLLIBOS fråga/);
    expect(git('ls-remote', 'origin', 'main')).not.toContain(git('rev-parse', 'HEAD').trim());
  });
  it('stoppar ett namn i commit-meddelandet och i ett filnamn', () => {
    commit('c.txt', 'ok\n', 'Rättelse efter Ollibos speltest');
    expect(push().stderr).toMatch(/meddelande eller författare/);
    git('reset', '-q', '--hard', 'HEAD~1');
    commit('ollibo.txt', 'ok\n');
    expect(push().stderr).toMatch(/ollibo\.txt: ollibo\.txt/);
  });
  it('stoppar mönstren i den andra filen, men inte namnet mitt i ett annat ord', () => {
    commit('d.txt', 'Han går i HEMLIG  klass.\n');
    expect(push().status).toBe(1);
    git('reset', '-q', '--hard', 'HEAD~1');
    commit('e.txt', 'Trollibo är ett påhittat ord.\n');
    expect(push().status).toBe(0);
  });
  it('stoppar pushen när namnfilen saknas eller är tom', () => {
    writeFileSync(join(hem, '.config', 'ordstaven', 'namn'), '# bara en kommentar\n');
    const r = push();
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/saknas eller är tom/);
    rmSync(join(hem, '.config', 'ordstaven', 'namn'));
    expect(push().status).toBe(1);
  });
});
