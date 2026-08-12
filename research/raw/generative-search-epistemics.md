# The Methodology of Exhaustive, Generative Hypothesis Search

*A research dossier on how to enumerate enormous numbers of candidate patterns and still end up with trustworthy findings.*

**Status:** research note / literature review. Companion to `pattern-matching-epistemics.md`, which documents the *failure* side — apophenia, base-rate neglect, the garden of forking paths. This document is its constructive counterpart: the disciplines that make large-scale pattern generation legitimate rather than pathological.

Every citation below was checked against a primary or authoritative secondary source. Items that could not be confirmed are listed in the **UNVERIFIED** section (§13) and are not asserted as fact elsewhere.

---

## Executive summary

A user asks for a system that "creates endless graphs and networks to then question and look further into." Read one way, that is a description of an apophenia machine — a device for manufacturing striking connections at industrial scale. Read another way, it is a description of genome-wide association studies, high-throughput screening, and literature-based discovery, three of the most productive discovery methodologies of the last forty years.

The difference between the two readings is not the number of hypotheses generated. It is six specific commitments, and this dossier is about what each one is and where the evidence for it comes from.

**The central claim, which sounds backwards and is not:**

> **Testing more hypotheses makes results more reliable — provided you test them *all*, and you declare how many.**

The proof case is genetics. Candidate-gene studies tested a handful of biologically plausible genes each, chosen by judgement. They produced thousands of papers and a replication catastrophe: 96% of novel candidate gene-by-environment findings in psychiatry were positive, against 27% of replication attempts (Duncan & Keller, 2011); the 18 most-studied depression candidate genes showed no association with depression in samples up to N = 443,264, and as a set were no more associated with depression than randomly chosen genes (Border et al., 2019). Genome-wide association studies test *every* common variant — of the order of a million effectively independent hypotheses, most biologically implausible — apply a threshold calibrated to exactly that number (5×10⁻⁸), and require replication in an independent cohort. GWAS findings are, in the words of a review devoted to the question, "highly replicable… an unprecedented phenomenon in complex trait genetics" (Marigorta et al., 2018). As of the 2 August 2026 release, the NHGRI-EBI GWAS Catalog holds 1,188,619 curated associations from 7,784 studies.

**Testing 10⁶ hypotheses produced a reliable literature; testing 10 produced a false one.** The reason is not caution. It is that exhaustive enumeration makes the comparison family *knowable*, and a knowable family can be corrected for. A selective search cannot be corrected for, because nobody — including the searcher — can reconstruct how many hypotheses would have been entertained had the data looked different (Gelman & Loken, 2014).

The six commitments that follow from this:

1. **Exploration and confirmation are different activities with different outputs.** Exploration produces hypotheses; only confirmation produces findings. Tukey insisted on both and on not confusing them (Tukey, 1977, 1980). Preregistration is the machinery that keeps the line visible (Nosek et al., 2018); registered reports are the strongest available implementation, and the positive-result rate drops from 96% to 44% when you use them (Scheel, Schijen & Lakens, 2021).
2. **Enumerate exhaustively, not selectively.** The family size is the output of enumeration and must be fixed before any candidate is scored.
3. **Report the whole distribution of defensible analyses, not one path through it.** Specification-curve analysis (Simonsohn, Simmons & Nelson, 2020), multiverse analysis (Steegen et al., 2016), vibration of effects (Patel, Burford & Ioannidis, 2015).
4. **Control error at the scale you are actually working at.** FDR for discovery pipelines (Benjamini & Hochberg, 1995; Storey, 2002), FWER for confirmatory ones, and an honest account of the *effective* number of independent tests when tests are correlated — which graph motifs emphatically are.
5. **Score every candidate against a null model that already knows the boring explanations.** For networks that means a degree-preserving null (Milo et al., 2002; Maslov & Sneppen, 2002) — with the important caveat that motif significance is highly sensitive to which null you choose (Artzy-Randrup et al., 2004).
6. **Publish the funnel, not the gallery.** The honest output of a generator is "N enumerated → M beat the null → K survived FDR at q → J replicated," and every survivor is a *question*, not a claim.

The two things this dossier says most emphatically. First: **a run that finds nothing is a successful run**, and must be reported as prominently as one that finds something — a generator that always finds something is a generator that is not testing anything. Second: **generate the hypotheses that would falsify your favoured claim, not only the ones that would support it.** A test a claim could not have failed establishes nothing about that claim (Mayo, 2018).

---

## 1. The exploratory/confirmatory distinction

### 1.1 Exploration is legitimate, necessary, and not a finding

The distinction is Tukey's, and he defended both halves of it with equal force. *Exploratory Data Analysis* (Tukey, 1977, Addison-Wesley, ISBN 0-201-07616-0) is the founding text; the sharpest statement of the relationship is the three-page paper "We Need Both Exploratory and Confirmatory" (Tukey, 1980, *The American Statistician*, 34(1), 23–25).

Tukey's position, which is the position this platform adopts:

- Exploratory data analysis is "an attitude, a flexibility, and a reliance on display, **not** a bundle of techniques."
- "Neither exploratory nor confirmatory is sufficient alone. To try to replace either by the other is madness."
- The value of an exploratory display is that it "forces us to notice what we never expected to see."

Nothing in the anti-apophenia literature argues against looking. It argues against *reporting what you found by looking as though you had predicted it*. Kerr (1998) named this failure HARKing — Hypothesizing After the Results are Known — presenting a post-hoc hypothesis in a research report as if it had been a priori (*Personality and Social Psychology Review*, 2(3), 196–217, [DOI: 10.1207/s15327957pspr0203_4](https://doi.org/10.1207/s15327957pspr0203_4)).

The output of exploration is a **hypothesis with a known provenance**: this pattern, generated by this enumeration, over this family of size N, ranked this highly. That is a real deliverable. It is not a claim about the world.

### 1.2 What has to happen between exploration and confirmation

Nosek, Ebersole, DeHaven & Mellor (2018), "The preregistration revolution," *PNAS*, 115(11), 2600–2606 ([DOI: 10.1073/pnas.1708274114](https://doi.org/10.1073/pnas.1708274114)) frame it as the difference between **postdiction and prediction**. Their abstract: "Progress in science relies in part on generating hypotheses with existing observations and testing hypotheses with new observations. This distinction between postdiction and prediction is appreciated conceptually but is not respected in practice. Mistaking generation of postdictions with testing of predictions reduces the credibility of research findings."

Three points from that paper matter for a generative engine:

1. **The problem is cognitive, not merely procedural.** Hindsight bias means researchers genuinely cannot reconstruct, after the fact, what they would have predicted. Honesty is not sufficient; a timestamped record is.
2. **Preregistration does not prohibit exploration.** It requires that exploratory and confirmatory analyses be *labelled distinctly*. A preregistration that yields a paper reporting both a confirmatory test and twenty exploratory analyses is a success, provided the twenty are marked.
3. **It works on pre-existing data**, which is the relevant case for a corporate-registry graph. The commitment is made before the analyst has seen the *outcome*, not before the data existed. The paper discusses techniques for this case explicitly.

The stronger implementation is the **Registered Report**: peer review of the question and the method happens *before* results are known, and acceptance is granted in principle on the basis of the design. Chambers (2013), "Registered Reports: A new publishing initiative at Cortex," *Cortex*, 49(3), 609–610 ([DOI: 10.1016/j.cortex.2012.12.016](https://doi.org/10.1016/j.cortex.2012.12.016)) introduced the format.

The empirical payoff is measurable and large. Scheel, Schijen & Lakens (2021), "An Excess of Positive Results: Comparing the Standard Psychology Literature With Registered Reports," *Advances in Methods and Practices in Psychological Science*, 4(2) ([DOI: 10.1177/25152459211007467](https://doi.org/10.1177/25152459211007467)) compared 71 published Registered Reports with a random sample of 152 standard hypothesis-testing psychology articles. Taking the first hypothesis of each article: **96% positive results in the standard literature, 44% in Registered Reports.**

That gap is the size of the distortion introduced by deciding what to report after seeing the results. For a network-pattern generator the number to keep in mind is that a well-run discovery process is expected to return *nothing* most of the time.

### 1.3 The operational translation

| Exploration produces | Confirmation produces |
|---|---|
| Ranked candidate lists with a declared family size | Findings with an error rate |
| Questions ("worth asking about") | Claims ("this is the case") |
| Hypotheses whose prior is now slightly raised | Hypotheses tested against data that did not generate them |
| A survival funnel | A single pre-specified test with a pre-specified falsifier |

The bridge between the columns is **new data, or a partition of the data that the generator did not see**. In GWAS this is the independent replication cohort. In a graph engine it is a split-half over edges, a later time window, or — best — a documentary source outside the graph entirely.

---

## 2. GWAS: why testing more hypotheses made the results more reliable

This is the intellectual core of the dossier. It is the one case where a field ran the experiment: the same scientific question, attacked first by selective hypothesis testing and then by exhaustive hypothesis testing, with the outcomes visible a decade apart.

### 2.1 The candidate-gene era and its collapse

The candidate-gene approach picked a small number of genes with a plausible biological story — a serotonin transporter for depression, a dopamine receptor for reward behaviour — and tested those. It was defensible in every respect except its results.

**The warning came early.** Ioannidis, Ntzani, Trikalinos & Contopoulos-Ioannidis (2001), "Replication validity of genetic association studies," *Nature Genetics*, 29(3), 306–309 ([PubMed 11600885](https://pubmed.ncbi.nlm.nih.gov/11600885/)) meta-analysed 370 studies covering 36 genetic associations and found that significant between-study heterogeneity was frequent, that the first study's result correlated only modestly with subsequent research, and that **the first study typically reported a stronger genetic effect than later work found** — the winner's curse, visible in 2001.

**The systematic audit.** Duncan & Keller (2011), "A critical review of the first 10 years of candidate gene-by-environment interaction research in psychiatry," *American Journal of Psychiatry*, 168(10), 1041–1049 ([DOI: 10.1176/appi.ajp.2011.11020191](https://doi.org/10.1176/appi.ajp.2011.11020191)) extracted data from all 103 published cG×E studies from 2000–2009. The headline numbers:

- **96% of novel cG×E studies were significant.**
- **27% of replication attempts were significant.**
- Positive replication attempts had *smaller* average sample sizes than negative ones — the signature of publication bias operating on the replication literature too.
- Power calculations on the observed sample sizes indicated the studies were badly underpowered, so that "most or even all positive cG×E findings represent type I errors."

**The obituary.** Border, Johnson, Evans, Smolen, Berley, Sullivan & Keller (2019), "No support for historical candidate gene or candidate gene-by-interaction hypotheses for major depression across multiple large samples," *American Journal of Psychiatry*, 176(5), 376–387 ([DOI: 10.1176/appi.ajp.2018.18070881](https://doi.org/10.1176/appi.ajp.2018.18070881)) empirically identified the 18 genes that had been studied ten or more times in depression research and tested them in samples ranging from N = 62,138 to N = 443,264, using preregistered analyses across multiple definitions of depression and multiple environmental moderators.

Result: "No clear evidence was found for any candidate gene polymorphism associations with depression phenotypes or any polymorphism-by-environment moderator effects. **As a set, depression candidate genes were no more associated with depression phenotypes than noncandidate genes.**" They further showed measurement error could not explain the nulls, and concluded that "the large number of associations reported in the depression candidate gene literature are likely to be false positives."

Two corroborating collapses, because one case is an anecdote:

- **Intelligence.** Chabris et al. (2012), "Most Reported Genetic Associations With General Intelligence Are Probably False Positives," *Psychological Science*, 23(11), 1314–1323 ([DOI: 10.1177/0956797611435528](https://doi.org/10.1177/0956797611435528)) attempted to replicate published associations between general intelligence and 12 specific variants across three longitudinal samples (N = 5,571; 1,759; 2,441). Of 32 independent tests, **1 was nominally significant** where power analysis predicted 10–15.
- **5-HTTLPR × stress**, the single most cited candidate G×E result in psychiatry. Risch et al. (2009), *JAMA*, 301(23), 2462–2471 ([PubMed 19531786](https://pubmed.ncbi.nlm.nih.gov/19531786/)) meta-analysed 14 qualifying studies and found no association between genotype and depression and no genotype × stress interaction. Culverhouse et al. (2018), *Molecular Psychiatry*, 23(1), 133–142 ([PubMed 28373689](https://pubmed.ncbi.nlm.nih.gov/28373689/)) ran a collaborative individual-level meta-analysis over 31 studies and 38,802 participants of European ancestry and again found no support for the interaction.

### 2.2 What GWAS did differently

A genome-wide association study genotypes hundreds of thousands to millions of variants across the genome and tests **every one** against the phenotype. It does not use biological plausibility to choose which to test. The landmark demonstration is the Wellcome Trust Case Control Consortium (2007), "Genome-wide association study of 14,000 cases of seven common diseases and 3,000 shared controls," *Nature*, 447(7145), 661–678 ([DOI: 10.1038/nature05911](https://doi.org/10.1038/nature05911)), which examined ~2,000 cases for each of seven diseases against ~3,000 shared controls on a 500K array and reported 24 independent association signals at P < 5×10⁻⁷.

Three structural features make it work, and all three transfer directly to graph pattern search.

**(a) The family size is knowable because the search is exhaustive.**

You cannot count the hypotheses a candidate-gene literature considered, because the counting would have to include every gene any researcher *would have* tested had the pilot data pointed elsewhere, plus every phenotype definition, every subgroup, every genetic model. That number does not exist. In a genome-wide scan it does exist: it is the number of variants on the array, adjusted for correlation between them.

**(b) The threshold is calibrated to that number.**

The genome-wide significance threshold of **5×10⁻⁸** is, to a first approximation, a Bonferroni correction of α = 0.05 over **one million effectively independent tests**: 0.05 / 10⁶ = 5×10⁻⁸.

The "one million" is not a guess. Because nearby variants are in linkage disequilibrium, the ~10⁷ common variants in the genome behave like far fewer independent tests, and two groups estimated how many:

- **Pe'er, Yelensky, Altshuler & Daly (2008)**, "Estimation of the multiple testing burden for genomewide association studies of nearly all common variants," *Genetic Epidemiology*, 32(4), 381–385 ([DOI: 10.1002/gepi.20303](https://doi.org/10.1002/gepi.20303)) used International HapMap data to estimate a testing burden of **~1 million independent tests genome-wide in Europeans, and roughly twice that in Africans** — the higher figure following from shorter LD blocks in African populations.
- **Dudbridge & Gusnanto (2008)**, "Estimation of significance thresholds for genomewide association scans," *Genetic Epidemiology*, 32(3), 227–234 ([DOI: 10.1002/gepi.20297](https://doi.org/10.1002/gepi.20297)) came at it by permutation, subsampling markers at increasing density and extrapolating to genome saturation with a fitted Monod function. They obtained **7.2×10⁻⁸ (95% CI 6.3–8.9×10⁻⁸)** for two-sided tests in a UK Caucasian population, and note earlier estimates of 5×10⁻⁸ (Risch & Merikangas, 1996) and 5.5×10⁻⁸ (International HapMap Consortium, 2005).

Two things to notice. First, the threshold is a *property of the search space*, not of any hypothesis in it — it is the same for a variant with a beautiful biological story and one in a gene desert. Second, the estimates converge on the same order of magnitude by unrelated methods, which is why the field settled on one number and stopped arguing.

**(c) Replication in an independent cohort is required, not optional.**

The NCI-NHGRI Working Group on Replication in Association Studies (2007), "Replicating genotype–phenotype associations," *Nature*, 447(7145), 655–660 ([DOI: 10.1038/447655a](https://doi.org/10.1038/447655a)) set out what counts as a replication: an independent dataset, adequate sample size, the same phenotype definition, a comparable study population, and the same variant assessed in the same direction of effect. This became an editorial requirement at the major journals, which is the enforcement mechanism that made it stick.

### 2.3 Why this made results *more* reliable, stated precisely

Four mechanisms, and it is worth separating them because a graph engine needs all four.

1. **The comparison family becomes real.** A correction is only honest if the denominator is honest. Exhaustive enumeration produces an honest denominator; selective search produces an unknowable one. This is the whole argument in one sentence.
2. **The threshold becomes brutal, which selects for large effects or large samples.** 5×10⁻⁸ is roughly a Z of 5.45. Candidate-gene studies with N in the hundreds could clear p < 0.05 on noise; nothing clears 5×10⁻⁸ on noise at that sample size. The threshold forced consortium-scale collaboration, which fixed the power problem as a side effect.
3. **Prior plausibility stops doing work it cannot do.** Duncan & Keller's power analysis makes the Bayesian point: with low power and a low prior probability that any given cG×E hypothesis is true, a "significant" result is more likely to be a type I error than a discovery. Candidate-gene selection *felt* like it raised the prior, because biological stories are persuasive. Empirically it did not: Border et al. found candidate genes performed no better than random genes. **Plausibility judgement added confidence without adding accuracy** — the exact profile of a bias.
4. **Replication is a genuinely independent test.** Because the discovery scan is exhaustive and pre-specified, the replication cohort tests one named variant at one threshold in one direction. That is a confirmatory test in Tukey's sense, and it is severe in Mayo's (§9).

### 2.4 The scale of the result

As of the release dated **2 August 2026**, the NHGRI-EBI GWAS Catalog contains **1,188,619 curated associations** across **7,784 studies** and **560,816 distinct variants**, with 193,739 full summary-statistics datasets ([GWAS Catalog release statistics](https://www.ebi.ac.uk/gwas/api/search/stats); catalogue described in Sollis et al., 2023, *Nucleic Acids Research*, 51(D1), D977–D985, [DOI: 10.1093/nar/gkac1010](https://doi.org/10.1093/nar/gkac1010)).

Marigorta, Rodríguez, Gibson & Navarro (2018), "Replicability and Prediction: Lessons and Challenges from GWAS," *Trends in Genetics*, 34(7), 504–517 ([DOI: 10.1016/j.tig.2018.03.005](https://doi.org/10.1016/j.tig.2018.03.005)) make the point that concerns us: "GWAS findings are highly replicable. This is an unprecedented phenomenon in complex trait genetics, and indeed in many areas of science, which in past decades have been plagued by false positives."

Visscher, Wray, Zhang, Sklar, McCarthy, Brown & Yang (2017), "10 Years of GWAS Discovery: Biology, Function, and Translation," *American Journal of Human Genetics*, 101(1), 5–22 ([DOI: 10.1016/j.ajhg.2017.06.005](https://doi.org/10.1016/j.ajhg.2017.06.005)) is the standard decadal review.

### 2.5 The transfer to graph pattern search

The mapping is close enough to be used as a design specification:

| GWAS | Graph pattern generator |
|---|---|
| Every common variant on the array | Every instance of every declared motif shape |
| Effective number of independent tests (~10⁶, LD-adjusted) | Effective family size, adjusted for overlap between motif instances |
| 5×10⁻⁸ threshold derived from that number | q-threshold applied by Benjamini–Hochberg over the declared family |
| Population-structure control (principal components) | Degree-preserving null model |
| Independent replication cohort | Split-half over edges, later time window, or external documentary source |
| GWAS Catalog: every association, effect size, and p-value published | The survival funnel: N enumerated → M → K → J, published with the nulls |
| Candidate-gene selection by biological plausibility | Selecting which connection to investigate because it looks suspicious |

The last row is the one to sit with. **"This connection looks suspicious, let me query it" is methodologically identical to candidate-gene selection**, and it has the same track record.

One honest disanalogy, which §5 develops: GWAS enjoys a well-understood correlation structure (linkage disequilibrium is measurable and local) and a null model — Hardy-Weinberg equilibrium plus population structure — that is grounded in mechanism. Graph motif nulls are neither. That is a reason to hold graph results to a *lower* confidence ceiling than GWAS results, not a reason to abandon the method.

---

## 3. Specification-curve and multiverse analysis: report the whole distribution

Sections 1 and 2 concern *which hypotheses* you test. This section concerns *how you test each one* — and the finding is that the analytic path is itself a hidden search space, usually larger than the one you were worrying about.

### 3.1 Multiverse analysis — the multiverse of datasets

Steegen, Tuerlinckx, Gelman & Vanpaemel (2016), "Increasing transparency through a multiverse analysis," *Perspectives on Psychological Science*, 11(5), 702–712 ([DOI: 10.1177/1745691616658637](https://doi.org/10.1177/1745691616658637); [open PDF](https://sites.stat.columbia.edu/gelman/research/published/multiverse_published.pdf)).

Their definition: "A multiverse analysis involves performing the analysis of interest across the whole set of data sets that arise from different reasonable choices for data processing." They describe it as "a systematic and organized extension of outlier analysis," closely related to the garden of forking paths (Gelman & Loken, 2013/2014) but scoped specifically to **data processing** — exclusions, transformations, codings — rather than model choice. They are explicit that they "ignored arbitrary choices occurring at the level of statistical models," and suggest crossing the data multiverse with a model multiverse for a fuller treatment.

The worked example is a reanalysis of Durante, Rae & Griskevicius (2013), "The fluctuating female vote: Politics, religion, and the ovulatory cycle," *Psychological Science*, 24(6), 1007–1016 ([DOI: 10.1177/0956797612466416](https://doi.org/10.1177/0956797612466416)), on fertility effects on religiosity and political attitudes. Tabulating the defensible choices — fertility-window definition, next-menstrual-onset estimation, cycle-length exclusions, relationship-status coding, certainty-rating exclusions — gives 180 combinations in Study 1 (120 after dropping internally inconsistent ones) and 270 in Study 2 (210 consistent).

The results are the argument:

- Religiosity, Study 1: **7 of 120** combinations gave a significant Fertility × Relationship interaction; "the remaining 94% lead to p values ranging from .05 to 1.0."
- Fiscal attitudes, Study 2: 8% of 210.
- Religiosity, Study 2: **88 of 210 (42%)**. Social attitudes 49%, voting 46%, donation 57%.

Their conclusion where the multiverse splits: "the only reasonable conclusion on the effect of fertility is that there is considerable scientific uncertainty," and a multiverse that fragments this way signals "a gaping hole in theory or in measurement."

**The graph analogue is exact and uncomfortable.** Before a single motif is counted, a corporate-network analyst has made a long list of individually defensible choices: which registers to include, what date window, whether a dissolved company stays in the graph, whether "possible-link" entity matches are edges, what confidence threshold on name matching, whether registered-agent addresses count as an edge type, whether to keep or drop edges through Big-4 auditors, whether to treat a group as one node or many. Each choice is arguable. Together they define hundreds of graphs. **A finding that holds in one of them is not a finding.**

Network-specific evidence that this is not hypothetical: Burkhardt & Gießing (2026), "The Comet Toolbox: Improving robustness in network neuroscience through multiverse analysis," *Imaging Neuroscience*, 4 ([DOI: 10.1162/IMAG.a.1122](https://doi.org/10.1162/IMAG.a.1122)) built a multiverse framework over 18 dynamic functional-connectivity methods plus graph-theoretic analyses. In a demonstration predicting autism diagnosis from resting-state fMRI, "classification accuracies varied widely across universes, with some pipelines performing close to chance while others achieved accuracies in the range of 70%." Same data, same question, same construction — the pipeline choice was worth up to twenty accuracy points.

### 3.2 Specification-curve analysis — the multiverse of models, with a significance test

Simonsohn, Simmons & Nelson (2020), "Specification curve analysis," *Nature Human Behaviour*, 4(11), 1208–1214 ([DOI: 10.1038/s41562-020-0912-z](https://doi.org/10.1038/s41562-020-0912-z); [author-hosted PDF](https://urisohn.com/sohn_files/wp/wordpress/wp-content/uploads/specification-curve-published-hand-corrected.pdf)). *(A Publisher Correction exists: 4(11), 1215, [DOI: 10.1038/s41562-020-00974-w](https://doi.org/10.1038/s41562-020-00974-w); its content is listed as UNVERIFIED in §13.)*

SCA adds to multiverse analysis the thing a generator most needs: **joint inference across the whole set of specifications**. The three steps, from the abstract:

> "(1) identifying the set of theoretically justified, statistically valid and non-redundant specifications; (2) displaying the results graphically, allowing readers to identify consequential specifications decisions; and (3) conducting joint inference across all specifications."

Step 3 is the methodological contribution. Because "the specifications are neither statistically independent nor part of a single model," the null distribution cannot be derived analytically. So they compute it by **resampling under the null**: shuffle the column of the variable whose effect is being tested, re-estimate *every* specification on the shuffled data, and repeat (they use 500 shuffles, re-running 1,728 specifications each time in one example). The only assumption is exchangeability, so "the resulting P values are hence 'exact', not dependent on distributional assumptions."

They propose three test statistics, computed on the observed specification set and compared against its shuffled null:

1. the **median effect estimate** across specifications;
2. the **share of specifications significant in the predicted direction**;
3. the **average Z across all specifications** (Stouffer's method), which "bypasses arbitrary discretization and is thus preferable from a statistical efficiency perspective."

They recommend reporting (2) and (3). Because specifications are correlated, they plot by *dominant vs non-dominant sign* rather than positive/negative.

The worked results show what the method buys you. In the hurricane-names reanalysis, 37 of 1,728 specifications were significant — but 425 of 500 shuffled null samples reached 37 or more, giving P = 0.85. All three tests were non-significant (P = 0.536, 0.850, 0.512). In a study of callback discrimination against Black-sounding names, 85 of 90 specifications were significant and all three tests gave P < 0.002. Their summary of the three cases they analyse: "one finding is robust, one is weak and one is not robust at all."

**The transferable insight:** "some specifications were significant" is not evidence. The question is whether *more* specifications were significant than a null in which the effect is absent would produce, given the same correlated specification set. This is the same logic as a degree-preserving motif null, applied to analytic choices instead of to edges.

### 3.3 Vibration of effects — quantifying how much the answer moves

Patel, Burford & Ioannidis (2015), "Assessment of vibration of effects due to model specification can demonstrate the instability of observational associations," *Journal of Clinical Epidemiology*, 68(9), 1046–1058 ([DOI: 10.1016/j.jclinepi.2015.05.029](https://doi.org/10.1016/j.jclinepi.2015.05.029); [PMC4555355](https://pmc.ncbi.nlm.nih.gov/articles/PMC4555355/)).

Vibration of effects (VoE) is "the extent to which an estimated association changes under multiple distinct analytical modeling approaches." Their design: NHANES cycles 1999–2000, 2001–2002 and 2003–2004 (9,555 / 11,021 / 10,100 participants with mortality follow-up), **417** clinical, environmental and physiological variables, **13** candidate adjustment covariates — hence **2¹³ = 8,192 Cox models per variable**, all-cause mortality as the outcome.

Two summary metrics, both percentile-based:

- **RHR (relative hazard ratio)** — "the ratio of the 99th percentile and 1st percentile HR."
- **RP (relative P-value)** — "the difference between the 99th and 1st percentile of −log10(p-value)."

The headline result is what they call the **"Janus effect"**: "the estimated HRs can be both greater and less than the null value (HR > 1 and HR ≤ 1) depending on what adjustments were made." **131 of 417 variables (31%) had a 99th-percentile HR above 1 and a 1st-percentile HR below 1** — that is, for nearly a third of exposures, the defensible model set contained both "protective" and "harmful" answers. A further 91 variables (22%) attenuated to p > 0.05 as adjustments increased, while only 53 (13%) stayed significant across all adjustment scenarios. Their conclusion: "When VoE is large, claims for observational associations should be very cautious."

**For the engine, VoE is the cheapest available honesty check.** It requires no new theory: run the candidate under every defensible covariate/filter set and publish the 1st–99th percentile band. If the band straddles the null, the correct output is "unstable under specification," and that is a publishable result in its own right.

### 3.4 What this section demands of a generator

Specification-curve and multiverse analysis are the reason a generator must not be allowed to *choose* its own graph. The declared family (§2.5) has to include the specification dimension, not just the pattern dimension. In practice:

- Fix the graph-construction choices in advance, or enumerate over them explicitly and report the curve.
- Never report the specification that produced the strongest result. Report the median and the share significant, against a shuffled null.
- A candidate that survives in one graph construction and not in the others is a **specification artefact**, and should be labelled as one rather than downgraded to "suggestive."


## 4. Multiple-testing control at scale

Exhaustive enumeration produces a family size. This section is about what to do with it. The short answer: **FDR for the discovery stage, FWER for the confirmatory stage, and a serious estimate of the *effective* number of independent tests, because graph motifs are heavily correlated and a naive Bonferroni over the raw count is both wrong and needlessly brutal.**

### 4.1 Family-wise error rate — the confirmatory frame

FWER control bounds the probability of making **even one** false rejection across the whole family. Bonferroni (test each hypothesis at α/m) is the crude version; Holm's step-down and Šidák are uniformly better and equally simple.

FWER is the right frame when a single false positive is unacceptable — a regulatory determination, a published allegation about a named person, a claim that will be defended in court. It is the wrong frame for a discovery pipeline: at m = 10⁶ candidate patterns, α/m ≈ 5×10⁻⁸ and almost nothing in a noisy corporate graph will clear it. That is not a bug in GWAS (where sample sizes grew to meet the threshold) but it is a real constraint on registry data, where you cannot recruit a bigger cohort.

### 4.2 False discovery rate — the discovery frame

**Benjamini & Hochberg (1995)**, "Controlling the false discovery rate: a practical and powerful approach to multiple testing," *JRSS Series B*, 57(1), 289–300 ([DOI: 10.1111/j.2517-6161.1995.tb02031.x](https://doi.org/10.1111/j.2517-6161.1995.tb02031.x)) control instead the *expected proportion of false discoveries among the discoveries made*. Sort the m p-values ascending; find the largest k with p₍ₖ₎ ≤ (k/m)·q; reject the first k.

FDR is the right frame for a generator because it answers the question an editor actually has: **"of the 61 patterns in this run, roughly how many are nothing?"** At q = 0.05 the answer is "about 3." That is a usable, publishable statement. FWER answers a question nobody asked ("what is the chance I made *any* error at all?") and answers it by refusing to report anything.

**Storey's reformulation** sharpens it usefully. Storey (2002), "A direct approach to false discovery rates," *JRSS Series B*, 64(3), 479–498 ([DOI: 10.1111/1467-9868.00346](https://doi.org/10.1111/1467-9868.00346)) defines the **positive FDR**, pFDR = E[V/R | R > 0] — the expected false-discovery proportion *conditional on having made at least one discovery*, which is the quantity you care about when you are staring at a non-empty result list. His Theorem 1 shows pFDR(Γ) = Pr(H = 0 | T ∈ Γ): a Bayesian posterior probability that a rejected hypothesis is null.

The key practical ingredient is **π₀, the proportion of true nulls in the family.** Storey estimates it from the flat right tail of the p-value histogram:

  π̂₀(λ) = #{pᵢ > λ} / ((1 − λ)·m)

The logic: null p-values are Uniform[0,1], so the density in the large-p region estimates the null share directly. Because Benjamini–Hochberg implicitly assumes π₀ = 1, plugging in an estimated π₀ < 1 recovers real power.

**The q-value** is defined in Storey (2002, Definitions 2–3) as q(t) = inf over rejection regions containing t of pFDR, and glossed in Storey & Tibshirani (2003), "Statistical significance for genomewide studies," *PNAS*, 100(16), 9440–9445 ([DOI: 10.1073/pnas.1530509100](https://doi.org/10.1073/pnas.1530509100)) as: **"The q value for a particular feature is the expected proportion of false positives incurred when calling that feature significant."**

For a graph engine, π₀ is a diagnostic in its own right. **A run whose p-value histogram is flat has π̂₀ ≈ 1 and contains nothing.** That is the most common honest outcome, and the engine should say so plainly.

### 4.3 Dependence — the part everyone skips, and the part that matters most for graphs

BH was proved under independence. **Benjamini & Yekutieli (2001)**, "The control of the false discovery rate in multiple testing under dependency," *Annals of Statistics*, 29(4), 1165–1188 ([DOI: 10.1214/aos/1013699998](https://doi.org/10.1214/aos/1013699998)) extended it: BH still controls FDR when the test statistics have **positive regression dependency on each of the test statistics corresponding to the true null hypotheses (PRDS)** — a condition that covers multivariate normal statistics with a positive correlation matrix, multivariate *t*, and comparisons of many treatments against one control. Under *arbitrary* dependence, the threshold must be divided by the harmonic factor Σᵢ₌₁ᵐ 1/i ≈ ln m + γ: compare p₍ₖ₎ to (k/m)·q / Σ(1/i). At m = 10⁶ that factor is roughly 14.4 — a real but survivable cost, and far cheaper than Bonferroni.

**Motif tests are not independent, and it is worth being blunt about why.** Overlapping subgraph instances share edges; a single high-degree node contributes to thousands of triads; the 13 connected triad types and the 199 connected tetrad types are counted from the same edge list and are algebraically constrained by each other. The dependence is neither obviously positive nor obviously bounded. In practice this means one of three defensible routes:

1. **Assume PRDS and use plain BH**, stating the assumption explicitly as an assumption.
2. **Use Benjamini–Yekutieli** and accept the ~ln(m) penalty; safest, and the right default when the correlation structure is unknown.
3. **Get the null distribution empirically**, by running the entire enumeration on each of many degree-preserving rewirings. This automatically carries whatever correlation the observed graph has, and is the network analogue of Simonsohn et al.'s shuffled-specification null (§3.2). It is the most expensive and the most trustworthy.

### 4.4 The effective number of independent tests

When tests are correlated, the raw count m overstates the multiplicity burden. The genetics literature solved this for linkage disequilibrium and the machinery transfers.

- **Cheverud (2001)**, "A simple correction for multiple comparisons in interval mapping genome scans," *Heredity*, 87(1), 52–58 ([DOI: 10.1046/j.1365-2540.2001.00901.x](https://doi.org/10.1046/j.1365-2540.2001.00901.x)) derives an effective count from **the variance of the eigenvalues of the marker correlation matrix**: M_eff = 1 + (k − 1)(1 − Var(λ)/k).
- **Nyholt (2004)**, "A simple correction for multiple testing for single-nucleotide polymorphisms in linkage disequilibrium with each other," *American Journal of Human Genetics*, 74(4), 765–769 ([DOI: 10.1086/383251](https://doi.org/10.1086/383251)) applies spectral decomposition to pairwise-LD matrices (implemented as SNPSpD).
- **Li & Ji (2005)**, "Adjusting multiple testing in multilocus analyses using the eigenvalues of a correlation matrix," *Heredity*, 95(3), 221–227 ([DOI: 10.1038/sj.hdy.6800717](https://doi.org/10.1038/sj.hdy.6800717)) argue Cheverud's M_eff is "overly large and leads to excessively conservative results," and use instead M_eff = Σ f(|λᵢ|) with f(x) = I(x ≥ 1) + (x − ⌊x⌋) — the integer part counting fully-correlated dimensions, the fractional part counting partial ones.

In all cases the adjusted threshold is α / M_eff. **This is exactly how the 5×10⁻⁸ threshold came to exist** (§2.2): ~10⁷ variants, M_eff ≈ 10⁶, α/M_eff = 5×10⁻⁸.

The graph analogue is direct and should be built: form the correlation matrix of candidate test statistics across a rewiring ensemble, take its eigenvalues, and compute M_eff. **The number you report as your family size should be M_eff, not the raw enumeration count** — and the ratio M_eff/N is itself informative, because a low ratio tells you the shapes you declared are largely redundant with each other.

### 4.5 The empirical null

Efron's contribution is the one most likely to save a graph engine from a systematic error. Efron (2004), "Large-scale simultaneous hypothesis testing: the choice of a null hypothesis," *JASA*, 99(465), 96–104 ([DOI: 10.1198/016214504000000089](https://doi.org/10.1198/016214504000000089)) and Efron (2008), "Microarrays, empirical Bayes and the two-groups model," *Statistical Science*, 23(1), 1–22 ([DOI: 10.1214/07-STS236](https://doi.org/10.1214/07-STS236)).

The point: with N test statistics in hand, **the null distribution can be estimated from the data instead of assumed.** Efron's z-values should be N(0,1) under the theoretical null; in his HIV protease-inhibitor example the central peak is actually N(−0.35, 1.20²). The local FDR, fdr(z) = f₀(z)/f(z), then changes drastically depending on which null you use: at z = −3, fdr = 0.097 under the theoretical null but 0.612 under the empirical null. "Interesting" becomes "definitely uninteresting."

The dedicated treatment of the correlation case is Efron (2007), "Correlation and large-scale simultaneous significance testing," *JASA*, 102(477), 93–103 ([DOI: 10.1198/016214506000001211](https://doi.org/10.1198/016214506000001211)).

For a corporate graph, the analogous failure is systematic and predictable: registry artefacts (shared registered-agent addresses, standard-issue nominee directors, a handful of dominant auditors) inflate the dispersion of every motif statistic relative to a clean configuration model. **Fitting the null to the bulk of the observed z-distribution rather than assuming it is the single highest-leverage correction available**, and it is the reason the engine should always plot its own z-histogram before believing any tail.

### 4.6 Summary rule

| Stage | Error frame | Why |
|---|---|---|
| Enumeration + scoring | **FDR** (BH, or BY under unknown dependence) | The output is a candidate list; the question is what share of it is noise |
| Rank and hand off | q-value per candidate | Interpretable per-item, comparable across shapes |
| Replication on held-out data | **FWER** at the candidate level | One named test, one threshold; a false positive here becomes a published claim |
| Publication about a named entity | FWER + external documentary corroboration | Statistics never license naming anyone by themselves |


## 5. Network-specific enumeration: subgraph census as the graph analogue of GWAS

Everything so far is general. This section is about what exhaustive enumeration means when the objects are subgraphs — and about the one place where the analogy to GWAS breaks down badly enough to need flagging.

### 5.1 The motif framework

Milo, Shen-Orr, Itzkovitz, Kashtan, Chklovskii & Alon (2002), "Network motifs: simple building blocks of complex networks," *Science*, 298(5594), 824–827 ([DOI: 10.1126/science.298.5594.824](https://doi.org/10.1126/science.298.5594.824)) defined network motifs as **patterns of interconnection occurring at numbers significantly higher than in randomised networks with the same degree sequence.**

Two features of the original method are worth stating precisely, because they are usually reported inaccurately:

- The paper uses P < 0.01 against 1,000 randomised networks (100 for the WWW), describes the Z-score only as "a qualitative measure of statistical significance," and additionally requires a motif to occur at least U = 4 times on **disjoint node sets** — a crude but effective guard against a single hub manufacturing the count.
- For four-node motifs they **nest the null model**, preserving all 13 three-node subgraph counts as well as the degree sequence, explicitly "so that a high significance was not assigned to a pattern only because it has a highly significant subpattern."

That second point is Milo et al. themselves acknowledging that subgraph counts mutually constrain each other, and it is the seed of §5.4.

**Provenance note:** Stone, Simberloff & Artzy-Randrup (2019), "Network motifs and their origins," *PLOS Computational Biology*, 15(4), e1006749 ([DOI: 10.1371/journal.pcbi.1006749](https://doi.org/10.1371/journal.pcbi.1006749)) trace the method back to null-model work in ecology — Connor & Simberloff (1979), Stone & Roberts (1992) — and observe that Stone's (1988) C-score with z = (C_obs − μ)/σ "is identical to the method for studying overrepresentation of motifs described by Milo and colleagues (2002) more than 10 years later."

### 5.2 Significance profiles

Milo, Itzkovitz, Kashtan, Levitt, Shen-Orr, Ayzenshtat, Sheffer & Alon (2004), "Superfamilies of evolved and designed networks," *Science*, 303(5663), 1538–1542 ([DOI: 10.1126/science.1089167](https://doi.org/10.1126/science.1089167)) extended motif counting from a per-motif verdict to a **whole-profile description**, which is a much better fit for a generative engine.

For each subgraph *i*: Zᵢ = (N_real,ᵢ − ⟨N_rand,ᵢ⟩) / std(N_rand,ᵢ), against a degree-preserving ensemble. The **significance profile** is "the vector of Z scores normalized to length 1": SPᵢ = Zᵢ / (Σ Zᵢ²)^½. Over the 13 connected directed triads this is the **triad significance profile (TSP)**.

Their rationale for the normalisation is directly relevant to comparing corporate networks of different sizes: "The normalization emphasizes the relative significance of subgraphs, rather than the absolute significance. This is important for comparison of networks of different sizes, because motifs in large networks tend to display higher Z scores than motifs in small networks."

**An important caveat they state themselves:** for four-node subgraphs the normalised Z-scores "show a significant dependence on the network size," so they abandon Z-scores there and use a **subgraph ratio profile (SRP)** built on Δᵢ = (N_real,ᵢ − ⟨N_rand,ᵢ⟩)/(N_real,ᵢ + ⟨N_rand,ᵢ⟩ + ε) with ε = 4, again normalised to unit length. In the main text the tetrad analysis covers the six non-directed connected tetrads.

The superfamilies they identify — rate-limited transcription networks dominated by the feed-forward loop; WWW plus social networks dominated by transitive triads; word-adjacency networks characterised by *under*-representation of triangle triads; a geometric group covering power grids and protein structures — are a reminder that motif profiles are a *classification* tool, not a detection tool.

**The transferable idea for this platform:** the right output of a corporate-graph census is a *profile* compared against profiles of comparable registers — an opposition-governed state, a rival conglomerate, an earlier period — not a verdict about a single motif. That is the `pattern-discipline` symmetry check expressed as a statistic.

### 5.3 Exhaustive enumeration algorithms

If enumeration must be exhaustive, the algorithm matters.

**The sampling bias that had to be fixed.** Kashtan, Itzkovitz, Milo & Alon (2004), "Efficient sampling algorithm for estimating subgraph concentrations and detecting network motifs," *Bioinformatics*, 20(11), 1746–1758 ([DOI: 10.1093/bioinformatics/bth163](https://doi.org/10.1093/bioinformatics/bth163)) introduced edge sampling (implemented as `mfinder`), whose runtime is asymptotically independent of network size. It is biased: Wernicke constructs two graphs each containing 28 connected size-3 subgraphs and exactly one copy of a target subgraph — which should therefore be sampled with probability 1/28 in both — and shows the algorithm samples it with probability 1/12 in one and 1/16 in the other. Kashtan et al. correct the *estimator* by weighting inversely to sampling probability, but as Wernicke notes, "the bias itself remains": rare and under-sampled subgraphs "are hardly ever found," so they are systematically overlooked as motif candidates. **A biased sampler cannot produce an honest family size**, which is fatal for the discipline in §2.

**ESU and RAND-ESU.** Wernicke (2006), "Efficient detection of network motifs," *IEEE/ACM Transactions on Computational Biology and Bioinformatics*, 3(4), 347–359 ([DOI: 10.1109/TCBB.2006.51](https://doi.org/10.1109/TCBB.2006.51)); earlier version Wernicke (2005), "A faster algorithm for detecting network motifs," *WABI 2005*, LNBI 3692, 165–177 ([DOI: 10.1007/11557067_14](https://doi.org/10.1007/11557067_14)).

ESU grows connected subgraphs vertex by vertex from each seed *v*, admitting a vertex *u* only if label(*u*) > label(*v*) and *u* lies in the **exclusive neighbourhood** N_excl(*w*, V_sub) = N({*w*}) \ N(V_sub) of the most recently added vertex. Its guarantee (Theorem 2): "Given a graph *G* and *k* ≥ 2, ESU enumerates all size-*k* subgraphs in *G* (each size-*k* subgraph is output exactly once)." The recursion forms an **ESU-tree** whose leaves are in bijection with the connected size-*k* subgraphs.

**RAND-ESU** is the part that makes exhaustive-in-spirit enumeration tractable at scale. It attaches a probability p_d to each tree depth *d* and traverses a child subtree only with that probability. Lemma 3: it "visits each leaf in the ESU-tree with probability ∏_d p_d" — **every subgraph is reached with equal probability**, so the concentration estimator is unbiased with no post-hoc weighting. To sample an expected fraction *q* you set ∏ p_d = q. Wernicke's practical advice is to make p_d larger at small *d* and smaller as *d* grows, which lowers variance in the sample count and spreads sampling across more regions of the graph.

This is the correct compromise for a graph too large for full enumeration: **uniform random sampling of the enumeration tree, with a declared sampling fraction**, rather than heuristic pruning. The family size remains knowable because it is N_sampled / q.

The tool implementation is Wernicke & Rasche (2006), "FANMOD: a tool for fast network motif detection," *Bioinformatics*, 22(9), 1152–1153 ([DOI: 10.1093/bioinformatics/btl038](https://doi.org/10.1093/bioinformatics/btl038)).

**Graphlets and orbits.** Pržulj, Corneil & Jurisica (2004), "Modeling interactome: scale-free or geometric?," *Bioinformatics*, 20(18), 3508–3515 ([DOI: 10.1093/bioinformatics/bth436](https://doi.org/10.1093/bioinformatics/bth436)) introduced **graphlets** — small connected non-isomorphic *induced* subgraphs — enumerating the 29 graphlets on 3–5 nodes and defining a relative graphlet frequency distance.

Pržulj (2007), "Biological network comparison using graphlet degree distribution," *Bioinformatics*, 23(2), e177–e183 ([DOI: 10.1093/bioinformatics/btl301](https://doi.org/10.1093/bioinformatics/btl301)) adds the single-edge graphlet to give **30 graphlets G0…G29 on 2–5 nodes, partitioned into 73 automorphism orbits (0–72)**. An orbit formalises positional non-equivalence within a graphlet: Orb(*x*) = {*y* ∈ V(X) | *y* = g(*x*) for some g ∈ Aut(X)}. The two end nodes of the 3-path lie in one orbit and its middle node in another. A node's **graphlet degree vector** is then the 73-dimensional count of how often it occupies each orbit — a direct generalisation of degree, which is simply orbit 0.

**Cite the erratum if you implement the formula.** Pržulj (2010), "Erratum to 'Biological network comparison using graphlet degree distribution'," *Bioinformatics*, 26(6), 853–854 ([DOI: 10.1093/bioinformatics/btq091](https://doi.org/10.1093/bioinformatics/btq091)): the 2007 paper wrongly asserted the per-orbit distance lies in [0,1]; it can exceed 1, making the published agreement formula capable of returning negative values. The corrected version normalises by the maximum possible distance.

**Why graphlet degree vectors matter here:** they turn "what role does this entity play in the network" into a 73-dimensional exhaustively-enumerated feature, which is a far better-posed question than "is this entity suspicious." It is a node-level census, and a census is the thing you can correct.

### 5.4 The null model is the claim — and this is where it gets hard

**The critique.** Artzy-Randrup, Fleishman, Ben-Tal & Stone (2004), "Comment on 'Network motifs: simple building blocks of complex networks' and 'Superfamilies of evolved and designed networks'," *Science*, 305(5687), 1107 ([DOI: 10.1126/science.1099334](https://doi.org/10.1126/science.1099334)).

Their core argument: the degree-preserving null "is not null to this form of localized aggregation and will thus misclassify a completely random but spatially clustered network as one that is nonrandom and that has significant network motifs." They demonstrate it two ways:

1. **A Gaussian spatial toy network** — a 30×30 grid of 900 nodes, edges added with probability falling off as a Gaussian in lattice distance, with no rule selecting for any motif. "Although the toy network is built devoid of any rule selecting particular motifs for their functions, we find that the same network motifs identified by Milo et al. for *C. elegans* are present, and the random null hypothesis must be rejected" — feed-forward, bi-fan and bi-parallel all at Z > 2 against 2,000 randomisations.
2. **Two variants of preferential attachment**, a rule which "in itself does not include any type of selection for or against particular motifs." In one variant the feed-forward loop is significantly *over*-represented; in the other, significantly *under*-represented.

Their conclusion: "the actual process by which a network is generated, even if it is free of selection for or against particular motif functions, can strongly bias an analysis that seeks to determine the quantitative significance of motifs." They add a specific warning about superfamilies: forcing a "common but inappropriate reference frame may give the wrong impression that different networks are in fact similar with respect to their motif significance profile."

**The reply**, Milo, Itzkovitz, Kashtan, Levitt & Alon (2004), *Science*, 305(5687), 1107 ([DOI: 10.1126/science.1100519](https://doi.org/10.1126/science.1100519)), is a quantitative rebuttal rather than a dismissal, and both halves are worth carrying. They **concede** that "network motifs can arise by various different mechanisms, not only by evolutionary selection for function." They then argue the toy models fail when the *full profile* is compared rather than a few motifs: the random-lattice model over-produces 3-loops (triad 8) and 3-loops with one mutual edge (triad 11), which are absent from the real neuronal network. "Based on symmetry, the ratio of feedforward loops and 3-loops can be generally shown to be 3:1 in lattice models. In the real neuronal network, the ratio is 22:1 (about 1500:70). Thus, geometry or clustering alone does not seem to explain the structure of the neuronal network of *C. elegans*." They close by conceding that "the present approach based on degree-preserving randomized networks is a simple first step" and that "more elaborate null-hypothesis models could in principle be used."

**What an investigative platform should take from this exchange, which is a lot:**

- A degree-preserving null is a *minimum*, not a sufficient control. It rules out "this is just hubs." It does not rule out geography, sector, regulation, vintage, or any other latent structure that clusters entities.
- **The Artzy-Randrup counterexample has an exact corporate analogue.** Companies in the same city, the same sector, the same size band and the same incorporation vintage share directors, auditors and addresses at elevated rates for reasons that involve no coordination at all. A degree-preserving null will report these as motifs. The right null is therefore **degree-preserving *and* attribute-stratified** — rewiring within sector × state × size band × vintage strata — and the platform should treat the difference between the two nulls as a diagnostic in its own right.
- Milo et al.'s own defence points to the right method: **compare the whole profile against a control network you have no theory about**, not a single motif against an abstract null. That is the symmetry check in `pattern-discipline`, and it is more robust than any single null model.
- Report the null-model choice as part of the claim, and report results under at least two nulls. A motif that survives only under the weakest null is a specification artefact (§3).

### 5.5 Getting the degree-preserving null right

The standard rewiring method has known failure modes.

**On the swap chain.** Milo, Kashtan, Itzkovitz, Newman & Alon, *On the uniform generation of random graphs with prescribed degree sequences*, arXiv:cond-mat/0312028 (2003/2004; [arXiv](https://arxiv.org/abs/cond-mat/0312028)) — note this remained a **preprint** and was never journal-published; cite it as such. It shows that the *matching* (stub-pairing) algorithm as naively repaired — resampling an offending stub pair rather than discarding the whole graph — produces non-uniform samples. Switching, by contrast, "samples correctly in the limit of long times"; their objection to it is that it "has no general theoretical bound on its mixing time."

The single most important implementation detail is theirs: swaps rejected because they would create a multi-edge or self-edge "are still counted to insure detailed balance." **A rejected swap must consume a step and leave the chain in place, not be redrawn.** An implementation that redraws until it finds a legal swap is sampling from the wrong distribution.

**The modern treatment.** Fosdick, Larremore, Nishimura & Ugander (2018), "Configuring random graph models with fixed degree sequences," *SIAM Review*, 60(2), 315–355 ([DOI: 10.1137/16M1087175](https://doi.org/10.1137/16M1087175)) is the right primary citation. They lay out **eight** distinct graph spaces from three binary choices — self-loops allowed or not, multi-edges allowed or not, and vertex-labelled versus stub-labelled. Their key structural result: the labelling choice is immaterial for simple graphs but **material for multigraphs and loopy graphs, where the field's stub-labelled default systematically inflates self-loops and multi-edges.** They prove uniformity of the double-edge-swap chain via double stochasticity, irreducibility and aperiodicity on the graph of graphs; for stub-labelled spaces the plain algorithm suffices, but for **vertex-labelled** spaces regularity fails and a Metropolis-style accept/reject correction keyed to edge multiplicities and self-loops is required. They are explicit that mixing-time theory for the non-simple spaces is poorly developed.

Supporting classics for the configuration model and switch-chain mixing — Bollobás (1980), Molloy & Reed (1995), Newman, Strogatz & Watts (2001), Kannan, Tetali & Vempala (1999) — are listed in §12.

Also relevant to a *bipartite* corporate graph (companies × directors, companies × contracts): the same machinery applies, but the space and its swap moves must be defined on the bipartite structure, not on a projection. **Projecting a bipartite graph to one mode and then rewiring destroys the constraint that produced the structure**, and will manufacture apparent motifs.

### 5.6 Motif tests are heavily correlated — and the field's answer is not "apply Bonferroni"

This is the most important technical finding in this section, and it is a genuine limit on what the method can deliver.

**Fodor, Brand, Stones & Buckle (2020), "Intrinsic limitations in mainstream methods of identifying network motifs in biology," *BMC Bioinformatics*, 21(1), 165** ([DOI: 10.1186/s12859-020-3441-x](https://doi.org/10.1186/s12859-020-3441-x); open access) makes three points that a graph engine must confront:

1. **Multiplicity is real and Bonferroni is both impractical and insufficient.** Motif search "involve[s] testing a very large number of hypotheses in parallel, with an associated high risk of false positive results." At six nodes there are >1.5 million candidate subgraphs. Bonferroni over that count is impractical, and — more importantly — *insufficient*, because the tests are dependent.
2. **The dependence is extreme.** They document Pearson correlations between subgraph frequencies routinely exceeding ±0.5 and reaching **−0.999** in the *E. coli* transcription-factor network, concluding that methods testing many motifs "without taking correlations into account will fail to deliver accurate results."
3. **The Z-score → p-value step is often unjustified.** Motif count distributions are frequently Poisson, binomial or multimodal rather than normal. They document a Z-score of 2011.9 implying p ≈ 10⁻⁸⁵⁸⁹⁵⁹ where theory bounds it at 10⁻²⁰⁵³⁸. They also report the switching null model giving **non-reproducible p-values across runs**, from 0.011 to 10⁻²⁹ on the same network.

Two further sources on the dependence structure:

- Ginoza & Mugler (2010), "Network motifs come in sets: correlations in the randomization process," *Physical Review E*, 82(1), 011921 ([DOI: 10.1103/PhysRevE.82.011921](https://doi.org/10.1103/PhysRevE.82.011921)) show that the edge-swapping randomisation *itself* induces correlations: "one subgraph's status as a motif may not be independent from the statuses of the other subgraphs."
- Winkler & Reichardt (2013), "Motifs in triadic random graphs based on Steiner triple systems," *Physical Review E*, 88(2), 022805 ([DOI: 10.1103/PhysRevE.88.022805](https://doi.org/10.1103/PhysRevE.88.022805)) give the combinatorial-constraint version: "inevitable correlations between the abundance of triad patterns, which occur solely for statistical reasons and need to be taken into account when discussing the functional implications of motif statistics."

**The field's response has been to abandon per-subgraph testing rather than to correct it**, and this is worth knowing before building anything:

- **MDL / compression:** Bénichou, Masson & Vestergaard (2024), *PLOS Computational Biology*, 20(10), e1012460 ([DOI: 10.1371/journal.pcbi.1012460](https://doi.org/10.1371/journal.pcbi.1012460)) name the problem directly — "accounting for the large number of possible motifs and their potential correlations in statistical testing" — and offer a minimum-description-length method that "inherently accounts for multiple testing and correlations between subgraphs."
- **ERGM:** Stivala & Lomi (2021), *Applied Network Science*, 6(1), 91 ([DOI: 10.1007/s41109-021-00434-y](https://doi.org/10.1007/s41109-021-00434-y)) estimate all configurations simultaneously, each conditional on the others, so dependence is *modelled* rather than corrected.
- **Analytic distribution theory** replacing the normality assumption: Picard, Daudin, Koskas, Schbath & Robin (2008), *Journal of Computational Biology*, 15(1), 1–20 ([DOI: 10.1089/cmb.2007.0137](https://doi.org/10.1089/cmb.2007.0137)) derive exact mean and variance under exchangeable random graph models and show a compound Poisson approximation beats the Gaussian one. See also Fischer et al. (2015) on motif-constrained ensembles.

**Honest statement of the limit.** There is, as far as this review could establish, **no published method whose primary contribution is FDR or Bonferroni correction over the triad or tetrad census.** A graph engine applying Benjamini–Hochberg across an enumerated motif family is therefore doing something defensible and standard in spirit but not directly validated in the motif literature. The correct posture is:

1. Use an **empirical null from the rewiring ensemble** rather than a Gaussian approximation to the Z-score (Fodor et al.; Picard et al.; Efron §4.5).
2. Use **Benjamini–Yekutieli** rather than plain BH, since positive dependence cannot be assumed (Ginoza & Mugler show the swap process induces correlations of unknown sign).
3. Report **M_eff** alongside N (§4.4), computed from the empirical correlation matrix of candidate statistics across the ensemble.
4. Treat the whole apparatus as producing **ranked questions**, and place the real evidential weight on §2's replication step and on external documentary corroboration — not on the q-value.

### 5.7 Where the GWAS analogy holds and where it breaks

| | GWAS | Graph motif census |
|---|---|---|
| Exhaustive enumeration | Yes, every variant | Yes, ESU/RAND-ESU with declared sampling fraction |
| Knowable family size | Yes | Yes |
| Correlation structure between tests | **Measurable and local** (LD decays with distance) | **Global, of unknown sign, induced partly by the null process itself** |
| Null model grounded in mechanism | Yes (Hardy-Weinberg + population structure) | **No.** Degree-preserving is a convention, and demonstrably not null to spatial/attribute clustering |
| Test statistic distribution known | Approximately, and checkable via QQ plot | Often non-normal; Z→p conversion frequently unjustified |
| Independent replication available | Yes, new cohorts | Partially — split-half, temporal holdout, external documents |
| Appropriate confidence ceiling | High | **Lower. Outputs are ranked questions, not findings.** |

The last row is the operative one. The method is sound; the confidence it can deliver on registry data is materially lower than what GWAS delivers on genotype data, and any engine built on it should be calibrated to that.


---

## 6. Link prediction, and why its evaluation is where generators go wrong

A system that "generates connections to look further into" is doing **link prediction**, whether or not it uses the term. Every suggested connection is an implicit prediction that an edge exists (or is missing from the record). That reframing is useful because link prediction is a mature subfield with a well-documented evaluation trap that a naive connection generator will fall straight into.

### 6.1 The founding formulation

Liben-Nowell & Kleinberg (2007), "The link-prediction problem for social networks," *Journal of the American Society for Information Science and Technology*, 58(7), 1019–1031 ([DOI: 10.1002/asi.20591](https://doi.org/10.1002/asi.20591)); conference version (2003) in *CIKM '03*, 556–559 ([DOI: 10.1145/956863.956972](https://doi.org/10.1145/956863.956972)).

They set the problem up properly: given a snapshot of a co-authorship network at time *t*, predict the edges that will appear by *t′*. They then compare a battery of purely structural predictors — graph distance (baseline), common neighbours, Jaccard's coefficient, Adamic/Adar, preferential attachment, Katz, hitting time and normalised hitting time, commute time and normalised commute time, rooted PageRank, and SimRank — plus three meta-approaches (low-rank approximation, unseen bigrams, clustering).

**The numbers are the reason to cite this paper in a dossier about generators**, because they establish both that structure carries real signal and that the signal is weak in absolute terms:

- The random baseline is "correct with probability between 0.15% (cond-mat) and 0.48% (astro-ph)."
- The best predictor tested, Katz clustering on gr-qc, "is correct on only about 16% of its predictions."
- Improvement over random for common neighbours ranges from **6.1×** (STOC/FOCS) through **18.0–41.1×** (individual arXiv sections) to **71.2×** (merged arXiv) and **147.0×** (Citeseer).
- On STOC/FOCS specifically: "we could not beat random guessing by a factor of more than about seven."

So: structural prediction beats chance by one to two orders of magnitude, and is still wrong roughly five times out of six on its own top predictions. **That is the accuracy profile of a well-built connection generator.** Any engine claiming better on registry data should be assumed broken until audited.

Clauset, Moore & Newman (2008), *Nature*, 453(7191), 98–101 ([DOI: 10.1038/nature06830](https://doi.org/10.1038/nature06830)) is the other landmark, and its methodological move is one this platform should copy: rather than fitting a single best hierarchical decomposition, they observe that real networks admit many roughly equally likely hierarchies, sample an *ensemble* by MCMC, and average predictions over it. **Averaging over an ensemble of equally defensible models instead of picking the best-fitting one is multiverse analysis (§3) arriving independently in network science.** (They evaluate by AUC/ROC — the metric §6.3 argues against for this task.)

### 6.2 The base-rate problem: extreme class imbalance

A sparse network with |V| nodes has O(|V|²) candidate pairs and only O(|V|) real new edges. The positive class rate is therefore of order 1/|V|.

Kitsak, Voitalov & Krioukov (2020), "Link prediction with hyperbolic geometry," *Physical Review Research*, 2(4), 043113 ([DOI: 10.1103/PhysRevResearch.2.043113](https://doi.org/10.1103/PhysRevResearch.2.043113)) state it exactly: "Link prediction in sparse networks is one example of class imbalance. Here the number of missing links is of the order of N and is significantly smaller than the number of nonlinks, which is of the order of N²."

Yang, Lichtenwalter & Chawla (2015), "Evaluating link prediction methods," *Knowledge and Information Systems*, 45(3), 751–782 ([DOI: 10.1007/s10115-014-0789-0](https://doi.org/10.1007/s10115-014-0789-0)) put a number on it: in the Condmat network "the imbalance ratio is around 10⁵," and classifiers are routinely presented with "class ratios of millions to one."

This is the same observation as the Law of Truly Large Numbers argument in the companion dossier, arriving from the machine-learning side. In an Indian corporate register with, say, 300,000 relevant entities, there are ~4.5 × 10¹⁰ candidate pairs. **A method with a false-positive rate of one in a million produces 45,000 false connections.** The absolute count of "suspicious links found" is therefore almost pure noise about the world and almost pure information about the size of the register.

### 6.3 Why AUC-ROC is the wrong metric, and what to use instead

This is the specific technical error to avoid, and it is extremely common.

**Saito & Rehmsmeier (2015)**, "The precision-recall plot is more informative than the ROC plot when evaluating binary classifiers on imbalanced datasets," *PLoS ONE*, 10(3), e0118432 ([DOI: 10.1371/journal.pone.0118432](https://doi.org/10.1371/journal.pone.0118432)) demonstrate the mechanism rather than merely asserting it. Their key contrast: "While the baseline is fixed with ROC, the baseline of PRC is determined by the ratio of positives (P) and negatives (N) as y = P / (P + N)."

Their worked example makes it concrete. Take a balanced dataset and an imbalanced one differing only in the number of negatives: "The point for the balanced case represents 160 FPs and 500 TPs… In contrast, the same point for the imbalanced case represents 1,600 FPs and 500 TPs… The ROC curves fail to explicitly show this performance difference." Same TPR, same FPR, same point in ROC space — **ten times as many false positives.** Precision, by contrast, moves from 0.6 to 0.33 and reports the degradation directly. They confirm ROC, CROC and concentrated-ROC plots are all unchanged between the balanced and imbalanced versions of the same data, and only the PR curve moves.

Kitsak et al. (2020) state the consequence for link prediction bluntly: because the false-positive rate "is normalized by |Ω_N|… most ROC curves tend to be substantially above the random baseline, yielding AUC scores close to 1.0, **regardless of the link prediction method**."

**Davis & Goadrich (2006)**, "The relationship between Precision-Recall and ROC curves," *ICML '06*, 233–240 ([DOI: 10.1145/1143844.1143874](https://doi.org/10.1145/1143844.1143874)) supply the theory:

> **Theorem 3.2.** "For a fixed number of positive and negative examples, one curve dominates a second curve in ROC space if and only if the first dominates the second in Precision-Recall space."

Note the precondition — *for a fixed number of positive and negative examples*. The equivalence holds within a fixed class distribution, which is exactly why it does not rescue AUC-ROC when the imbalance is the thing you are worried about. And crucially: "algorithms that optimize the area under the ROC curve are not guaranteed to optimize the area under the PR curve." Their counterexample uses 20 positives and 2,000 negatives, where curve II wins on AUC-ROC (0.875 vs 0.813) and loses catastrophically on AUC-PR (0.038 vs 0.514). They also note that "in PR space it is incorrect to linearly interpolate between points" — a practical trap in implementation.

**Lichtenwalter & Chawla (2012)**, "Link Prediction: Fair and Effective Evaluation," *ASONAM 2012*, 376–383 ([DOI: 10.1109/ASONAM.2012.68](https://doi.org/10.1109/ASONAM.2012.68)), expanded substantially in Yang, Lichtenwalter & Chawla (2015), give the field's recommendation: "we recommend the use of precision-recall threshold curves and associated areas in lieu of receiver operating characteristic curves due to complications that arise from extreme imbalance in the link prediction classification problem," and in their guidelines: "Use precision-recall curves and AUPR as an evaluation measure. In our experiments we observe that ROC curves and AUROC can be deceptive."

For an investigative engine the operationally right metric is even simpler: **precision@k**, where k is the number of candidates a human will actually look at. If an analyst can review 50 leads a week, the only number that matters is what fraction of the top 50 are worth reviewing.

### 6.4 Two evaluation traps that will silently inflate your numbers

**(a) Sampling the negative class.** Because the negative class is enormous, it is tempting to evaluate against a sample of non-edges. Yang, Lichtenwalter & Chawla (2015) prove this is dangerous:

> **Theorem 4.1.** "For any link predictor P the variance of measured performance increases when the negative class sample percentage p decreases."

Empirically, testing sampling rates from 10⁻³% to 10²% with 100 resamples each, the AUROC *mean* stays roughly stable while negatives still outnumber positives, but **variance grows as the sample shrinks**, and the mean destabilises below a dataset-dependent threshold (stable to 1% of negatives in Condmat, only to 10% in Facebook, DBLP and Enron). At balanced sampling, "the area deviates by more than 0.007 for PropFlow and more than 0.01 for preferential attachment, which may exceed significant variations in performance across link predictors." Their Corollary 4.2 shows variance scaling with |V|² in sparse networks — **the problem gets worse as the graph gets bigger.** And on threshold metrics: "Precision is inflated by the removal of false positives." Their guidance is to not undersample negatives from test sets; if you must, sample purely at random and report the rate.

**(b) Temporal leakage.** A random train/test split over edges lets the model see the future. de Bruin, Veenman, van den Herik & Takes (2020), "Experimental Evaluation of Train and Test Split Strategies in Link Prediction," in *Complex Networks & Their Applications IX*, 79–91 ([DOI: 10.1007/978-3-030-65351-4_7](https://doi.org/10.1007/978-3-030-65351-4_7)): "we find evidence that random splits may result in too optimistic results, whereas a temporal split may give a more fair and realistic indication of performance."

The magnitude is not marginal. Temporal-split performance was lower than random-split on every one of six networks; on Ask Ubuntu average precision dropped by **80%**. Over ten non-overlapping snapshots: AP of 0.025 ± 0.009 (random split) versus 0.0061 ± 0.0016 (temporal split), with "the random split precision-recall curves clearly dominate their temporal counterparts at all snapshots."

The authors are honest that a temporal split is not a full fix — "it still allows that the same node is both used in train and test set" — and call for more rigorous strategies. **For a corporate graph the temporal split is mandatory and still not sufficient**, because incorporation, appointment and filing dates are exactly the kind of information a random split leaks.

### 6.5 What this means for the engine

1. Never report AUC-ROC for a candidate-connection generator. Report **precision@k** and a PR curve, with the base rate printed next to them.
2. Print the denominator — the number of candidate pairs — every time. It is the number that makes an impressive absolute count unimpressive.
3. Evaluate on a **temporal holdout**, not a random one.
4. Do not sample the negative class for evaluation; if forced to, sample uniformly at random and declare the rate.
5. Expect a top-of-list precision of order 10–20% on a well-built system, per Liben-Nowell & Kleinberg. Anything much higher on registry data is probably leakage or a definitional artefact (the model has rediscovered that companies in the same group share directors).

---

## 7. The stopping problem

An endless generator has to stop. How it stops determines whether anything it produced means anything.

### 7.1 Optional stopping is a p-hacking mechanism

Simmons, Nelson & Simonsohn (2011), "False-Positive Psychology: Undisclosed Flexibility in Data Collection and Analysis Allows Presenting Anything as Significant," *Psychological Science*, 22(11), 1359–1366 ([DOI: 10.1177/0956797611417632](https://doi.org/10.1177/0956797611417632)) simulated the effect of four ordinary researcher degrees of freedom on the false-positive rate of a two-condition design with 20 observations per cell, over 15,000 simulations. From their Table 1, at p < .05:

| Researcher degree of freedom | False-positive rate at p < .05 |
|---|---|
| A: two dependent variables (r = .50) | 9.5% |
| B: add 10 more observations per cell | 7.7% |
| C: control for gender or gender × treatment | 11.7% |
| D: drop (or not) one of three conditions | 12.6% |
| A + B | 14.4% |
| A + B + C | 30.9% |
| **A + B + C + D** | **60.7%** |

Their Figure 1 addresses optional stopping specifically, and the numbers there are the ones that matter for a generator. A researcher starting with 10 observations per condition and testing after **every single additional observation** (stopping at significance or n = 50) reaches a false-positive rate of **22.1%**; checking every 5 observations gives 17.0%, every 10 gives 14.3%, every 20 gives 12.7%. Starting from a minimum of 20 per condition: 16.3% / 13.3% / 11.5% / 10.4%.

*(Note for anyone citing this: the widely-repeated "22.1%" is a Figure 1 value for checking after every single observation, not a Table 1 row and not "checking every 10 observations," which is 14.3%. Table 1's optional-stopping row — one extra look after 10 more observations per cell — is 7.7%.)*

**The direct translation to a graph engine:** "run the enumeration, look at the results, tweak the threshold or add a shape, run again, publish the run that produced something" is optional stopping. It is the single most likely way a well-intentioned generator becomes a false-positive machine, because each individual re-run feels like debugging rather than like testing.

### 7.2 The clinical-trials solution: spend your alpha on a schedule

Sequential testing has a rigorous version, developed for clinical trials where interim looks are ethically mandatory.

- **Wald (1945)**, *Annals of Mathematical Statistics*, 16(2), 117–186 ([DOI: 10.1214/aoms/1177731118](https://doi.org/10.1214/aoms/1177731118)) — the sequential probability ratio test, the origin of the field.
- **Pocock (1977)**, *Biometrika*, 64(2), 191–199 ([DOI: 10.1093/biomet/64.2.191](https://doi.org/10.1093/biomet/64.2.191)) — a constant adjusted nominal significance level at each of K equally spaced interim looks. **O'Brien & Fleming (1979)**, *Biometrics*, 35(3), 549–556 ([DOI: 10.2307/2530245](https://doi.org/10.2307/2530245)) — stringent early boundaries relaxing toward the final analysis.
- **Lan & DeMets (1983)**, *Biometrika*, 70(3), 659–663 ([DOI: 10.1093/biomet/70.3.659](https://doi.org/10.1093/biomet/70.3.659)) — the **alpha-spending function** α*(t), which "characterizes the rate at which the error level α is spent." Its practical virtue is that the number and timing of the looks need not be fixed in advance, only the spending schedule.

The concept that transfers: **you have a fixed budget of type-I error, and every look at the data spends some of it.** Peeking is not forbidden; peeking for free is.

### 7.3 The modern solution: e-values and anytime-valid inference

A p-value's guarantee — Pr(p ≤ α) ≤ α — holds only at a pre-fixed sample size. Under continuous monitoring, the running minimum of a p-value hits any threshold with probability 1. E-values do not have this defect.

- **Grünwald, de Heide & Koolen (2024)**, "Safe testing," *Journal of the Royal Statistical Society Series B*, 86(5), 1091–1128 ([DOI: 10.1093/jrsssb/qkae011](https://doi.org/10.1093/jrsssb/qkae011)): "We develop the theory of hypothesis testing based on the e-value, a notion of evidence that, unlike the p-value, allows for effortlessly combining results from several studies in the common scenario where the decision to perform a new study may depend on previous outcomes. Tests based on e-values are safe, i.e. they preserve type-I error guarantees, under such optional continuation."
- **Ramdas, Grünwald, Vovk & Shafer (2023)**, "Game-theoretic statistics and safe anytime-valid inference," *Statistical Science*, 38(4), 576–601 ([DOI: 10.1214/23-STS894](https://doi.org/10.1214/23-STS894)): "Safe anytime-valid inference (SAVI) provides measures of statistical evidence and certainty — e-processes for testing and confidence sequences for estimation — that remain valid at all stopping times, accommodating continuous monitoring and analysis of accumulating data and optional stopping or continuation for any reason. These measures crucially rely on test martingales, which are nonnegative martingales starting at one."

The mechanism in one line: an e-value satisfies E_null[E] ≤ 1, a test martingale is a nonnegative martingale starting at 1, so by the optional stopping theorem the expectation bound survives at **any** stopping time, and Ville's inequality gives Pr_null(sup_t E_t ≥ 1/α) ≤ α. Rejecting when E ≥ 1/α controls type-I error uniformly over time, regardless of when or why you stopped.

**This is the theoretically correct answer for a continuously-running graph engine over a continuously-updating register**, and it is the direction the engine should eventually move in. It is not the answer for version one, because it requires reformulating each motif test as a likelihood ratio, which is not straightforward against a rewiring null.

### 7.4 The practical answer: a declared enumeration budget

For a discovery pipeline the workable rule is the one GWAS uses, and it is a *pre-commitment*, not a stopping rule in the sequential-analysis sense:

> **Declare the enumeration budget before the run: these shapes, this graph construction, this q, this replication split. Run it to completion. Report the funnel whatever it contains.**

This dissolves the stopping problem rather than solving it: there is no decision to stop, because the run's extent was fixed before it began. What remains is a governance requirement:

- **Re-running is a new family.** Re-running the same enumeration on the same data after seeing the result, with a tweaked parameter, is not a continuation — it is a second family, and reporting it as if it were the first is exactly Simmons et al.'s scenario D.
- **Re-run on a schedule, not on disappointment.** Re-run when the data changes (a new filing quarter, a new register), not when the result is boring. A time-triggered re-run is a genuine new sample; a disappointment-triggered re-run is optional stopping.
- **Keep an append-only run log.** Every run, its declared family, its q, and its funnel — including the runs that found nothing. Without this the enumeration budget is a claim rather than a fact.
- **If the schedule is frequent, spend alpha.** A quarterly re-run over the same growing register is a sequence of interim analyses, and Lan–DeMets alpha-spending is the appropriate correction; treating each quarter as a fresh independent test is not.

---

## 8. What the output of a generator should look like

### 8.1 The gallery is the failure mode

The default output of a connection-finding system is a gallery: a set of striking images, each showing a cluster, a path, or a co-occurrence, presented because it looked notable. A gallery is uninterpretable in principle, because the reader cannot compute anything from it. They do not know how many candidates were examined, what fraction of them looked like this, what a random graph with the same degree sequence would have produced, or whether the analyst stopped searching when the pictures got good.

This is not a presentational complaint. It is the same defect that made the candidate-gene literature false (§2.1) and it has the same fix.

### 8.2 The honest output: a ranked candidate list with a survival rate

The deliverable of an exhaustive generator is:

> **N enumerated → M beat the null → K survived FDR at q → J replicated on the held-out split.**

with a ranked list of the J survivors, ordered by q-value and nothing else. Four properties make this honest where a gallery is not:

1. **N is the declared comparison family.** Publishing it is what makes every downstream number meaningful; withholding it is what makes them fiction (§2.3, §4).
2. **The ratios are interpretable without any domain knowledge.** J/N is the discovery rate; the reader can compare it to what a null process would give. A generator returning J/N ≈ q is returning noise at exactly the rate the correction permits.
3. **The rank order is a statistic, not a judgement.** Ranking by q-value rather than by how interesting a candidate looks is what stops the generator smuggling apophenia back in at the presentation layer.
4. **A run with J = 0 is reportable.** This is the property galleries structurally cannot have. A generator whose output format only accommodates hits will always produce hits.

The evidential status of a survivor: a survivor has earned **someone's time**, and nothing else. The correct verb is "worth asking about." Not "shows," not "reveals," not "raises questions about" — that last phrase is a rhetorical device for asserting a claim while disclaiming it, and it should be banned from generator output specifically because it is so natural to write.

### 8.3 Terminology: what to call the funnel, and what not to call it

The four-stage structure above is naturally drawn as a funnel. **A note on naming, because a nearby term is already taken:** "significance funnel" is an established term in the meta-analysis literature with a *different* meaning. Mathur & VanderWeele (2020), "Sensitivity analysis for publication bias in meta-analyses," *Journal of the Royal Statistical Society Series C*, 69(5), 1091–1119 ([DOI: 10.1111/rssc.12440](https://doi.org/10.1111/rssc.12440)) introduce "a modified funnel plot, the 'significance funnel'," which separates *affirmative* studies (significant and in the desired direction) from *non-affirmative* ones and overlays the pooled estimate from all studies against the pooled estimate from the non-affirmative studies alone. It is implemented as `significance_funnel()` in the CRAN package **PublicationBias**. It is a publication-bias diagnostic, not a description of a search pipeline.

It should also be kept distinct from the classical funnel plot and Egger's test — Egger, Davey Smith, Schneider & Minder (1997), "Bias in meta-analysis detected by a simple, graphical test," *BMJ*, 315(7109), 629–634 ([DOI: 10.1136/bmj.315.7109.629](https://doi.org/10.1136/bmj.315.7109.629)) — which key on effect-estimate/precision asymmetry rather than on affirmative status.

**In this platform the four-stage structure is called the discovery funnel or the survival funnel, and those are our terms, not citations.** Using "significance funnel" for it would collide with an established meaning and should be avoided.

The underlying accounting logic *is* borrowed from a real place: it is the GWAS Catalog convention of publishing every association tested with its effect size and p-value, not only the ones that cleared threshold (§2.4), and the Registered Reports convention of publishing the result whatever it is (§1.2).

### 8.4 Why the survival rate is the finding

Two runs over the same corporate graph. Run A: 4 candidate patterns published, no denominator. Run B: **1,284,000 enumerated → 9,100 beat the degree-preserving null at p < 0.05 → 61 survived BH at q = 0.05 → 4 replicated on the held-out edge split.**

The published output is identical — four patterns. But Run B tells you the graph is overwhelmingly explained by its degree sequence, that the four survivors are roughly 1 in 300,000 candidates, and that about 3 of the 61 FDR survivors were expected false at q = 0.05 before replication cut them to 4. Run A tells you nothing, and is compatible with a generator that examined exactly four candidates and published all of them.

Ioannidis (2005), "Why most published research findings are false," *PLoS Medicine*, 2(8), e124 ([DOI: 10.1371/journal.pmed.0020124](https://doi.org/10.1371/journal.pmed.0020124)) gives the underlying result: the positive predictive value of a claimed finding depends on the pre-study odds, the power, and the bias in the field — not on the p-value alone. A survival funnel is a direct, empirical statement of pre-study odds for that run. It is the number that lets a reader do the Ioannidis calculation instead of guessing.

### 8.5 What must ship with every survivor

Per the platform's `pattern-discipline` skill, and consistent with everything above, a surviving candidate ships with five fields or it does not ship as a finding at all:

| Field | Why |
|---|---|
| The pattern, stated structurally | Not narratively, and never with intent attributed |
| The null-model z-score or q-value, and which null | §5: the null choice *is* the claim (Artzy-Randrup et al., 2004) |
| The comparison family size N | §2, §4: without it nothing else is interpretable |
| The innocent reading | §9: at least one non-agentic mechanism that also predicts this pattern |
| The specific evidence that would upgrade or kill it | §1: a pre-specified falsifier, written before the follow-up |

And one more, specific to generative search: **the specification band** (§3.3) — how the candidate behaves across the defensible graph constructions, not only the one that produced it.

---

## 9. Adversarial and red-team generation

Sections 1–8 make a generator honest about *how much* it searched. This section is about *what* it searched for, and it is the part most easily skipped because it feels like sabotage of one's own work.

### 9.1 Severity: a test a claim could not have failed is worthless

Mayo (2018), *Statistical Inference as Severe Testing: How to Get Beyond the Statistics Wars*, Cambridge University Press ([DOI: 10.1017/9781107286184](https://doi.org/10.1017/9781107286184); ISBN 9781107054134) gives the criterion in two forms.

**The weak severity requirement:** "One does not have evidence for a claim if little if anything has been done to rule out ways the claim may be false." Expanded: "If data x agree with a claim C but the method used is practically guaranteed to find such agreement, and had little or no capability of finding flaws with C even if they exist, then we have bad evidence, no test (BENT)."

**The strong severity principle:** "We have evidence for a claim C just to the extent it survives a stringent scrutiny. If C passes a test that was highly capable of finding flaws or discrepancies from C, and yet none or few are found, then the passing result, x, is evidence for C."

*(Page numbers for these passages are UNVERIFIED — see §13.)*

The severity criterion is the sharpest available diagnosis of what a naive connection generator does wrong. **A search that only looks for evidence of coordination is practically guaranteed to find agreement with the coordination hypothesis**, because a large graph contains instances of every shape (Ramsey theory; see the companion dossier §5.2). Such a search has no capability of finding flaws in the hypothesis, so its output is not evidence — regardless of how many connections it produces or how striking they look.

This is the same idea Popper formalised as falsifiability (*The Logic of Scientific Discovery*, Hutchinson, 1959; *Conjectures and Refutations*, Routledge & Kegan Paul, 1963), with the important addition that Mayo makes it *quantitative*: severity is a property of the test's error probabilities, not a binary property of the hypothesis.

### 9.2 Multiple working hypotheses

The organisational fix predates the statistics by a century. Chamberlin (1890), "The method of multiple working hypotheses," *Science*, 15(366), 92–96 ([DOI: 10.1126/science.ns-15.366.92](https://doi.org/10.1126/science.ns-15.366.92)) diagnosed the problem as affection: a researcher who develops a single explanation acquires "parental affection" for it and thereafter fits evidence to it rather than testing it. His remedy is to hold several rival explanations simultaneously so that no one of them is the analyst's child.

Platt (1964), "Strong inference," *Science*, 146(3642), 347–353 ([DOI: 10.1126/science.146.3642.347](https://doi.org/10.1126/science.146.3642.347)) formalised this into a procedure: devise alternative hypotheses, devise an experiment whose alternative possible outcomes will exclude at least one, carry it out, and recurse.

**For a graph engine, the operational rule is: for every pattern the generator surfaces, it must also generate the enumeration that would kill it.** Concretely, at least three non-agentic rivals should be instantiated as runnable queries, not as prose caveats:

| Rival hypothesis | The enumeration that tests it |
|---|---|
| Degree artefact — these entities are just large | Re-score against the degree-preserving null; report the z |
| Sector/geography artefact — this is what firms of this type in this state look like | Re-score against an attribute-stratified null (§5.4) |
| Service-provider artefact — a shared auditor, registrar or agent connects everything | Re-run with inverse-frequency edge weighting and an informativeness floor |
| Coverage artefact — the "absence" is a hole in the data | Check the register's completeness for that stratum and period before treating a structural void as a finding |
| Method artefact — the generator produces this everywhere | **The symmetry check**: run the identical enumeration on a matched control entity nobody has a theory about |

The last row is the highest-value single test available and the cheapest to run. If an opposition-governed state, a rival conglomerate, or an earlier administration produces an equally striking funnel, the method is generating the finding rather than detecting it.

### 9.3 Generative search that was validated adversarially: literature-based discovery

There is a real precedent for a hypothesis generator that earned trust, and its structure is instructive. Swanson (1986), "Fish oil, Raynaud's syndrome, and undiscovered public knowledge," *Perspectives in Biology and Medicine*, 30(1), 7–18, established **literature-based discovery**. The ABC model: if the literature contains A–B links and B–C links but no A–C link, then A–C is a *candidate hypothesis* for domain experts to evaluate. Swanson noted that dietary fish oils reduce blood viscosity, platelet aggregation and vascular reactivity — all elevated in Raynaud's syndrome — and generated the untested A–C hypothesis.

The critical feature is what happened next. The hypothesis was **not published as a finding.** It was published as a hypothesis and then tested independently, in a double-blind placebo-controlled trial: DiGiacomo, Kremer & Shah (1989), "Fish-oil dietary supplementation in patients with Raynaud's phenomenon: a double-blind, controlled, prospective study," *American Journal of Medicine*, 86(2), 158–164 ([PubMed 2536517](https://pubmed.ncbi.nlm.nih.gov/2536517/)). Thirty-two patients, randomised to fish oil or olive-oil placebo, evaluated at baseline and 6, 12 and 17 weeks. The conclusion: fish oil "improves tolerance to cold exposure and delays the onset of vasospasm in patients with primary, but not secondary, Raynaud's phenomenon" — a partial confirmation, with a boundary condition the generator could not have supplied.

**This is exactly the division of labour this dossier argues for.** The generator's job ended at "here is a candidate nobody has tested." Somebody else, using a different kind of evidence, decided whether it was true. A generator that had reported the fish-oil connection as a finding would have been wrong about secondary Raynaud's and right by luck about primary.

---

## 10. The legitimacy table

| Generative approach | What makes it legitimate | What you must declare in advance | Failure mode if you skip that |
|---|---|---|---|
| **Exploratory data analysis** (Tukey 1977, 1980) | It is labelled as exploration and its output is hypotheses | That this run is exploratory, and that no claim will be sourced to it alone | HARKing (Kerr 1998): the post-hoc pattern is written up as a prediction |
| **Preregistered confirmatory test** (Nosek et al. 2018; Chambers 2013) | The prediction was recorded before the outcome was seen | Hypothesis, analysis plan, falsifier, timestamped | Postdiction sold as prediction; a 96%-positive literature (Scheel et al. 2021) |
| **Exhaustive enumeration / GWAS-style scan** (Pe'er et al. 2008; Border et al. 2019) | The comparison family is knowable because nothing was skipped | The shape set, the graph, the family size N | Candidate-gene collapse: 96% novel-positive, 27% replication (Duncan & Keller 2011) |
| **Specification curve** (Simonsohn et al. 2020) | All defensible specifications are run and jointly tested against a shuffled null | The full specification set, and which test statistic (median / share / mean Z) | Reporting the specification that worked; 37-of-1728 significant reads as a finding when P = 0.85 |
| **Multiverse over data processing** (Steegen et al. 2016) | Every defensible dataset construction is analysed | The choice grid: exclusions, codings, windows, thresholds | One arbitrary pipeline's result presented as the result; 94% of paths gave p > .05 in their example |
| **Vibration of effects** (Patel et al. 2015) | The 1st–99th percentile band of estimates is published | The adjustment-variable set (2^k models) | The Janus effect goes unreported — 31% of exposures admitted both HR > 1 and HR < 1 |
| **FDR-controlled discovery** (Benjamini & Hochberg 1995; Storey 2002) | Expected false-discovery proportion is bounded and stated | q, the family, and the dependence assumption (BH vs BY) | q-values computed on survivors rather than the declared family; meaningless error rate |
| **Effective-test correction** (Cheverud 2001; Li & Ji 2005) | Multiplicity burden reflects actual, not nominal, independence | How M_eff is computed and from what correlation matrix | Either absurd conservatism (raw Bonferroni) or none at all |
| **Motif census with degree-preserving null** (Milo et al. 2002, 2004) | Counts are compared to a degree-matched ensemble, not to intuition | The null's definition, the number of rewirings, the RNG seed | Spatially or sectorally clustered random graphs read as designed (Artzy-Randrup et al. 2004) |
| **Subgraph enumeration** (Wernicke 2006) | Every size-k connected subgraph reached exactly once, or sampled uniformly | k, and the sampling fraction ∏p_d if not exhaustive | Biased sampling (Kashtan et al. 2004) hides rare subgraphs and falsifies the family size |
| **Graphlet degree vectors** (Pržulj 2007) | Node role is a 73-orbit census, not a judgement | Which orbits, and the 2010 erratum's corrected distance formula | Cherry-picked structural features; a negative "agreement" score |
| **Link prediction / connection suggestion** (Liben-Nowell & Kleinberg 2007) | Evaluated on held-out future edges with a precision metric | The evaluation split (temporal), the metric (precision@k), the base rate | AUC-ROC near 1.0 regardless of method (Kitsak et al. 2020); 80% AP drop under a temporal split (de Bruin et al. 2020) |
| **Continuous / repeated running** (Lan & DeMets 1983; Grünwald et al. 2024) | Error budget is spent on a declared schedule, or e-values are used | The enumeration budget, or the alpha-spending function, or the e-process | Optional stopping: up to 22.1% false-positive rate from peeking alone (Simmons et al. 2011) |
| **Adversarial / red-team generation** (Chamberlin 1890; Platt 1964; Mayo 2018) | Hypotheses that would falsify the favoured claim are enumerated too | The rival hypotheses, and the control entity for the symmetry check | Bad evidence, no test — the claim passed something it could not have failed |

---

## 11. Operating procedure for a graph-pattern generator

This is the procedure the platform's `pattern-prospecting` skill and `src/graph/prospector.ts` implement. Each step maps to a section above.

**Phase 0 — Declare (before any data is touched)**

1. **Declare the shapes.** Write down the *forms* of pattern to be enumerated — multiplex dyads, closed triads, concentrated stars, structural voids — with their exact definitions. Declaring shapes after seeing what the graph contains is the garden of forking paths in a lab coat. *(§1, §3)*
2. **Declare the graph construction.** Registers included, date window, entity-resolution confidence threshold, which edge types count, whether dissolved entities remain. Or, better, declare the *grid* of defensible constructions and commit to reporting the specification curve. *(§3)*
3. **Declare q, the null model(s), the number of rewirings, the RNG seed, and the replication split.** *(§4, §5)*
4. **Declare the enumeration budget and the re-run schedule.** Re-running after a disappointing result is a new family. *(§7)*
5. **Declare the falsifier for each shape** — what result would make you conclude the shape finds nothing in this graph. *(§9)*

**Phase 1 — Enumerate**

6. **Generate every instance of every declared shape.** No ranking, filtering or judgement during enumeration. Use ESU for exact enumeration, or RAND-ESU with a declared sampling fraction ∏p_d where the graph is too large. *(§5.3)*
7. **Include the boring ones.** A dyad with one relationship is a candidate that scored badly, not a non-candidate. Dropping it before correction shrinks the denominator and inflates every surviving q-value. *(§2, §4)*
8. **Fix N.** The enumeration count *is* the multiple-comparison family. Record it — and M_eff (§4.4) — before any candidate is scored.

**Phase 2 — Score against a null**

9. **Score every candidate against a degree-preserving null**, analytically via a configuration model or empirically by double-edge swaps. Rejected swaps must consume a step to preserve detailed balance. *(§5.5)*
10. **Score again against an attribute-stratified null** — rewiring within sector × state × size band × vintage. Report both. A candidate surviving only the weaker null is a specification artefact. *(§5.4)*
11. **Use the empirical null distribution from the ensemble**, not a Gaussian approximation to the z-score. Plot the z-histogram; if its bulk is not centred and unit-scaled, refit the null before reading any tail. *(§4.5, §5.6)*

**Phase 3 — Correct**

12. **Apply Benjamini–Hochberg at the declared q over the declared family** — not over the survivors, and not per-shape unless each shape was declared as its own family in advance. Use Benjamini–Yekutieli where dependence cannot be assumed positive; for motif families it generally cannot. *(§4.2, §4.3, §5.6)*
13. **Estimate π₀** from the p-value histogram and report it. π̂₀ ≈ 1 means the run found nothing, and that is a result. *(§4.2)*

**Phase 4 — Replicate**

14. **Split and re-test.** Split edges into halves — or better, into an earlier and a later time window — and require the candidate to clear the threshold independently in both. This is the replication cohort, and it is the single most effective filter: most candidates that clear FDR on the full graph do not clear it twice. *(§2.2, §6.4)*
15. **Where the candidate is a predicted connection rather than an observed motif, evaluate with precision@k on a temporal holdout.** Never AUC-ROC. Print the base rate next to it. *(§6)*

**Phase 5 — Red-team**

16. **Run the symmetry check.** The identical enumeration on a matched control entity, sector or period nobody has a theory about. If the control funnel looks the same, the method is the finding. *(§9.2)*
17. **Instantiate the rival hypotheses as queries**, not as prose caveats — degree, sector, service-provider, coverage, method (table in §9.2).
18. **Audit entity resolution on every node in every surviving candidate.** A merged node fabricates a bridge; a split node hides one. Confirm by DIN, CIN, office or constituency, never by name string.

**Phase 6 — Report**

19. **Publish the funnel, always, in this form:**

    > **N enumerated (M_eff effective) → M beat the null at p → K survived FDR at q → J replicated.**

20. **Rank survivors by q-value and nothing else.** Not by how interesting they look.
21. **Ship each survivor with six fields** (§8.5): the structural statement, the null-model score and which null, N, the innocent reading, the falsifier, and the specification band.
22. **Report zero-survivor runs as prominently as any other.** A generator that always finds something is not testing anything. *(§8.2)*
23. **Name nothing and no one.** Every survivor is a question that has earned someone's time. It hands off to the evidence-auditor for the date test, the identity test and the denial capture. The verb is "worth asking about" — never "shows," "reveals," or "raises questions about."
24. **Log the run append-only**, including its declared family, q, seed and funnel. Without the log, the enumeration budget is a claim rather than a fact. *(§7.4)*

---

## 12. References

**Exploratory vs confirmatory; preregistration**

- Tukey, J. W. (1977). *Exploratory Data Analysis*. Reading, MA: Addison-Wesley. ISBN 0-201-07616-0.
- Tukey, J. W. (1980). We need both exploratory and confirmatory. *The American Statistician*, 34(1), 23–25. https://doi.org/10.1080/00031305.1980.10482706
- Kerr, N. L. (1998). HARKing: Hypothesizing after the results are known. *Personality and Social Psychology Review*, 2(3), 196–217. https://doi.org/10.1207/s15327957pspr0203_4
- Nosek, B. A., Ebersole, C. R., DeHaven, A. C., & Mellor, D. T. (2018). The preregistration revolution. *PNAS*, 115(11), 2600–2606. https://doi.org/10.1073/pnas.1708274114
- Chambers, C. D. (2013). Registered Reports: A new publishing initiative at Cortex. *Cortex*, 49(3), 609–610. https://doi.org/10.1016/j.cortex.2012.12.016
- Scheel, A. M., Schijen, M. R. M. J., & Lakens, D. (2021). An excess of positive results: Comparing the standard psychology literature with Registered Reports. *Advances in Methods and Practices in Psychological Science*, 4(2). https://doi.org/10.1177/25152459211007467

**Candidate genes, GWAS, and the replication contrast**

- Ioannidis, J. P. A., Ntzani, E. E., Trikalinos, T. A., & Contopoulos-Ioannidis, D. G. (2001). Replication validity of genetic association studies. *Nature Genetics*, 29(3), 306–309. https://pubmed.ncbi.nlm.nih.gov/11600885/
- Duncan, L. E., & Keller, M. C. (2011). A critical review of the first 10 years of candidate gene-by-environment interaction research in psychiatry. *American Journal of Psychiatry*, 168(10), 1041–1049. https://doi.org/10.1176/appi.ajp.2011.11020191
- Border, R., Johnson, E. C., Evans, L. M., Smolen, A., Berley, N., Sullivan, P. F., & Keller, M. C. (2019). No support for historical candidate gene or candidate gene-by-interaction hypotheses for major depression across multiple large samples. *American Journal of Psychiatry*, 176(5), 376–387. https://doi.org/10.1176/appi.ajp.2018.18070881
- Chabris, C. F., Hebert, B. M., Benjamin, D. J., et al. (2012). Most reported genetic associations with general intelligence are probably false positives. *Psychological Science*, 23(11), 1314–1323. https://doi.org/10.1177/0956797611435528
- Risch, N., Herrell, R., Lehner, T., et al. (2009). Interaction between the serotonin transporter gene (5-HTTLPR), stressful life events, and risk of depression: A meta-analysis. *JAMA*, 301(23), 2462–2471. https://pubmed.ncbi.nlm.nih.gov/19531786/
- Culverhouse, R. C., Saccone, N. L., Horton, A. C., et al. (2018). Collaborative meta-analysis finds no evidence of a strong interaction between stress and 5-HTTLPR genotype contributing to the development of depression. *Molecular Psychiatry*, 23(1), 133–142. https://pubmed.ncbi.nlm.nih.gov/28373689/
- Wellcome Trust Case Control Consortium (2007). Genome-wide association study of 14,000 cases of seven common diseases and 3,000 shared controls. *Nature*, 447(7145), 661–678. https://doi.org/10.1038/nature05911
- Pe'er, I., Yelensky, R., Altshuler, D., & Daly, M. J. (2008). Estimation of the multiple testing burden for genomewide association studies of nearly all common variants. *Genetic Epidemiology*, 32(4), 381–385. https://doi.org/10.1002/gepi.20303
- Dudbridge, F., & Gusnanto, A. (2008). Estimation of significance thresholds for genomewide association scans. *Genetic Epidemiology*, 32(3), 227–234. https://doi.org/10.1002/gepi.20297
- NCI-NHGRI Working Group on Replication in Association Studies (Chanock, S. J., et al.) (2007). Replicating genotype–phenotype associations. *Nature*, 447(7145), 655–660. https://doi.org/10.1038/447655a
- Visscher, P. M., Wray, N. R., Zhang, Q., Sklar, P., McCarthy, M. I., Brown, M. A., & Yang, J. (2017). 10 years of GWAS discovery: Biology, function, and translation. *American Journal of Human Genetics*, 101(1), 5–22. https://doi.org/10.1016/j.ajhg.2017.06.005
- Marigorta, U. M., Rodríguez, J. A., Gibson, G., & Navarro, A. (2018). Replicability and prediction: Lessons and challenges from GWAS. *Trends in Genetics*, 34(7), 504–517. https://doi.org/10.1016/j.tig.2018.03.005
- Sollis, E., Mosaku, A., Abid, A., et al. (2023). The NHGRI-EBI GWAS Catalog: Knowledgebase and deposition resource. *Nucleic Acids Research*, 51(D1), D977–D985. https://doi.org/10.1093/nar/gkac1010
- NHGRI-EBI GWAS Catalog release statistics (release dated 2 August 2026). https://www.ebi.ac.uk/gwas/api/search/stats

**Specification curve, multiverse, vibration of effects**

- Simonsohn, U., Simmons, J. P., & Nelson, L. D. (2020). Specification curve analysis. *Nature Human Behaviour*, 4(11), 1208–1214. https://doi.org/10.1038/s41562-020-0912-z (Publisher Correction: 4(11), 1215. https://doi.org/10.1038/s41562-020-00974-w)
- Steegen, S., Tuerlinckx, F., Gelman, A., & Vanpaemel, W. (2016). Increasing transparency through a multiverse analysis. *Perspectives on Psychological Science*, 11(5), 702–712. https://doi.org/10.1177/1745691616658637
- Durante, K. M., Rae, A., & Griskevicius, V. (2013). The fluctuating female vote: Politics, religion, and the ovulatory cycle. *Psychological Science*, 24(6), 1007–1016. https://doi.org/10.1177/0956797612466416
- Patel, C. J., Burford, B., & Ioannidis, J. P. A. (2015). Assessment of vibration of effects due to model specification can demonstrate the instability of observational associations. *Journal of Clinical Epidemiology*, 68(9), 1046–1058. https://doi.org/10.1016/j.jclinepi.2015.05.029
- Burkhardt, M., & Gießing, C. (2026). The Comet Toolbox: Improving robustness in network neuroscience through multiverse analysis. *Imaging Neuroscience*, 4. https://doi.org/10.1162/IMAG.a.1122
- Gelman, A., & Loken, E. (2013). *The garden of forking paths: Why multiple comparisons can be a problem, even when there is no "fishing expedition" or "p-hacking" and the research hypothesis was posited ahead of time.* Unpublished manuscript, Department of Statistics, Columbia University (copy dated 14 Nov 2013). https://sites.stat.columbia.edu/gelman/research/unpublished/p_hacking.pdf
- Gelman, A., & Loken, E. (2014). The statistical crisis in science. *American Scientist*, 102(6), 460. https://doi.org/10.1511/2014.111.460
- Ioannidis, J. P. A. (2005). Why most published research findings are false. *PLoS Medicine*, 2(8), e124. https://doi.org/10.1371/journal.pmed.0020124

**Multiple testing**

- Benjamini, Y., & Hochberg, Y. (1995). Controlling the false discovery rate: A practical and powerful approach to multiple testing. *JRSS Series B*, 57(1), 289–300. https://doi.org/10.1111/j.2517-6161.1995.tb02031.x
- Benjamini, Y., & Yekutieli, D. (2001). The control of the false discovery rate in multiple testing under dependency. *Annals of Statistics*, 29(4), 1165–1188. https://doi.org/10.1214/aos/1013699998
- Storey, J. D. (2002). A direct approach to false discovery rates. *JRSS Series B*, 64(3), 479–498. https://doi.org/10.1111/1467-9868.00346
- Storey, J. D., & Tibshirani, R. (2003). Statistical significance for genomewide studies. *PNAS*, 100(16), 9440–9445. https://doi.org/10.1073/pnas.1530509100
- Efron, B. (2004). Large-scale simultaneous hypothesis testing: The choice of a null hypothesis. *JASA*, 99(465), 96–104. https://doi.org/10.1198/016214504000000089
- Efron, B. (2007). Correlation and large-scale simultaneous significance testing. *JASA*, 102(477), 93–103. https://doi.org/10.1198/016214506000001211
- Efron, B. (2008). Microarrays, empirical Bayes and the two-groups model. *Statistical Science*, 23(1), 1–22. https://doi.org/10.1214/07-STS236
- Cheverud, J. M. (2001). A simple correction for multiple comparisons in interval mapping genome scans. *Heredity*, 87(1), 52–58. https://doi.org/10.1046/j.1365-2540.2001.00901.x
- Nyholt, D. R. (2004). A simple correction for multiple testing for single-nucleotide polymorphisms in linkage disequilibrium with each other. *American Journal of Human Genetics*, 74(4), 765–769. https://doi.org/10.1086/383251
- Li, J., & Ji, L. (2005). Adjusting multiple testing in multilocus analyses using the eigenvalues of a correlation matrix. *Heredity*, 95(3), 221–227. https://doi.org/10.1038/sj.hdy.6800717

**Network motifs, enumeration, null models**

- Milo, R., Shen-Orr, S., Itzkovitz, S., Kashtan, N., Chklovskii, D., & Alon, U. (2002). Network motifs: Simple building blocks of complex networks. *Science*, 298(5594), 824–827. https://doi.org/10.1126/science.298.5594.824
- Milo, R., Itzkovitz, S., Kashtan, N., Levitt, R., Shen-Orr, S., Ayzenshtat, I., Sheffer, M., & Alon, U. (2004). Superfamilies of evolved and designed networks. *Science*, 303(5663), 1538–1542. https://doi.org/10.1126/science.1089167
- Artzy-Randrup, Y., Fleishman, S. J., Ben-Tal, N., & Stone, L. (2004). Comment on "Network motifs: Simple building blocks of complex networks" and "Superfamilies of evolved and designed networks." *Science*, 305(5687), 1107. https://doi.org/10.1126/science.1099334
- Milo, R., Itzkovitz, S., Kashtan, N., Levitt, R., & Alon, U. (2004). Response to comment on "Network motifs" and "Superfamilies of evolved and designed networks." *Science*, 305(5687), 1107. https://doi.org/10.1126/science.1100519
- Stone, L., Simberloff, D., & Artzy-Randrup, Y. (2019). Network motifs and their origins. *PLOS Computational Biology*, 15(4), e1006749. https://doi.org/10.1371/journal.pcbi.1006749
- Kashtan, N., Itzkovitz, S., Milo, R., & Alon, U. (2004). Efficient sampling algorithm for estimating subgraph concentrations and detecting network motifs. *Bioinformatics*, 20(11), 1746–1758. https://doi.org/10.1093/bioinformatics/bth163
- Wernicke, S. (2005). A faster algorithm for detecting network motifs. In *Algorithms in Bioinformatics (WABI 2005)*, LNBI 3692, 165–177. Springer. https://doi.org/10.1007/11557067_14
- Wernicke, S. (2006). Efficient detection of network motifs. *IEEE/ACM Transactions on Computational Biology and Bioinformatics*, 3(4), 347–359. https://doi.org/10.1109/TCBB.2006.51
- Wernicke, S., & Rasche, F. (2006). FANMOD: A tool for fast network motif detection. *Bioinformatics*, 22(9), 1152–1153. https://doi.org/10.1093/bioinformatics/btl038
- Pržulj, N., Corneil, D. G., & Jurisica, I. (2004). Modeling interactome: Scale-free or geometric? *Bioinformatics*, 20(18), 3508–3515. https://doi.org/10.1093/bioinformatics/bth436
- Pržulj, N. (2007). Biological network comparison using graphlet degree distribution. *Bioinformatics*, 23(2), e177–e183. https://doi.org/10.1093/bioinformatics/btl301
- Pržulj, N. (2010). Erratum to "Biological network comparison using graphlet degree distribution." *Bioinformatics*, 26(6), 853–854. https://doi.org/10.1093/bioinformatics/btq091
- Milo, R., Kashtan, N., Itzkovitz, S., Newman, M. E. J., & Alon, U. (2003/2004). *On the uniform generation of random graphs with prescribed degree sequences.* arXiv:cond-mat/0312028 (preprint; never journal-published). https://arxiv.org/abs/cond-mat/0312028
- Fosdick, B. K., Larremore, D. B., Nishimura, J., & Ugander, J. (2018). Configuring random graph models with fixed degree sequences. *SIAM Review*, 60(2), 315–355. https://doi.org/10.1137/16M1087175
- Bollobás, B. (1980). A probabilistic proof of an asymptotic formula for the number of labelled regular graphs. *European Journal of Combinatorics*, 1(4), 311–316. https://doi.org/10.1016/S0195-6698(80)80030-8
- Molloy, M., & Reed, B. (1995). A critical point for random graphs with a given degree sequence. *Random Structures & Algorithms*, 6(2–3), 161–180. https://doi.org/10.1002/rsa.3240060204
- Newman, M. E. J., Strogatz, S. H., & Watts, D. J. (2001). Random graphs with arbitrary degree distributions and their applications. *Physical Review E*, 64, 026118. https://doi.org/10.1103/PhysRevE.64.026118
- Kannan, R., Tetali, P., & Vempala, S. (1999). Simple Markov-chain algorithms for generating bipartite graphs and tournaments. *Random Structures & Algorithms*, 14(4), 293–308. https://doi.org/10.1002/(SICI)1098-2418(199907)14:4<293::AID-RSA1>3.0.CO;2-G
- Maslov, S., & Sneppen, K. (2002). Specificity and stability in topology of protein networks. *Science*, 296(5569), 910–913. https://doi.org/10.1126/science.1065103

**Correlated motif tests and alternatives to per-subgraph testing**

- Fodor, J., Brand, M., Stones, R. J., & Buckle, A. M. (2020). Intrinsic limitations in mainstream methods of identifying network motifs in biology. *BMC Bioinformatics*, 21(1), 165. https://doi.org/10.1186/s12859-020-3441-x
- Ginoza, R., & Mugler, A. (2010). Network motifs come in sets: Correlations in the randomization process. *Physical Review E*, 82(1), 011921. https://doi.org/10.1103/PhysRevE.82.011921
- Winkler, M., & Reichardt, J. (2013). Motifs in triadic random graphs based on Steiner triple systems. *Physical Review E*, 88(2), 022805. https://doi.org/10.1103/PhysRevE.88.022805
- Bénichou, A., Masson, J.-B., & Vestergaard, C. L. (2024). Compression-based inference of network motif sets. *PLOS Computational Biology*, 20(10), e1012460. https://doi.org/10.1371/journal.pcbi.1012460
- Stivala, A., & Lomi, A. (2021). Testing biological network motif significance with exponential random graph models. *Applied Network Science*, 6(1), 91. https://doi.org/10.1007/s41109-021-00434-y
- Fischer, R., Leitão, J. C., Peixoto, T. P., & Altmann, E. G. (2015). Sampling motif-constrained ensembles of networks. *Physical Review Letters*, 115(18), 188701. https://doi.org/10.1103/PhysRevLett.115.188701
- Picard, F., Daudin, J.-J., Koskas, M., Schbath, S., & Robin, S. (2008). Assessing the exceptionality of network motifs. *Journal of Computational Biology*, 15(1), 1–20. https://doi.org/10.1089/cmb.2007.0137

**Link prediction and its evaluation**

- Liben-Nowell, D., & Kleinberg, J. (2003). The link prediction problem for social networks. In *CIKM '03*, 556–559. https://doi.org/10.1145/956863.956972
- Liben-Nowell, D., & Kleinberg, J. (2007). The link-prediction problem for social networks. *JASIST*, 58(7), 1019–1031. https://doi.org/10.1002/asi.20591
- Clauset, A., Moore, C., & Newman, M. E. J. (2008). Hierarchical structure and the prediction of missing links in networks. *Nature*, 453(7191), 98–101. https://doi.org/10.1038/nature06830
- Davis, J., & Goadrich, M. (2006). The relationship between Precision-Recall and ROC curves. In *ICML '06*, 233–240. https://doi.org/10.1145/1143844.1143874
- Saito, T., & Rehmsmeier, M. (2015). The precision-recall plot is more informative than the ROC plot when evaluating binary classifiers on imbalanced datasets. *PLoS ONE*, 10(3), e0118432. https://doi.org/10.1371/journal.pone.0118432
- Lichtenwalter, R., & Chawla, N. V. (2012). Link prediction: Fair and effective evaluation. In *ASONAM 2012*, 376–383. https://doi.org/10.1109/ASONAM.2012.68
- Yang, Y., Lichtenwalter, R. N., & Chawla, N. V. (2015). Evaluating link prediction methods. *Knowledge and Information Systems*, 45(3), 751–782. https://doi.org/10.1007/s10115-014-0789-0
- Kitsak, M., Voitalov, I., & Krioukov, D. (2020). Link prediction with hyperbolic geometry. *Physical Review Research*, 2(4), 043113. https://doi.org/10.1103/PhysRevResearch.2.043113
- de Bruin, G. J., Veenman, C. J., van den Herik, H. J., & Takes, F. W. (2020). Experimental evaluation of train and test split strategies in link prediction. In *Complex Networks & Their Applications IX*, 79–91. Springer. https://doi.org/10.1007/978-3-030-65351-4_7

**Stopping, sequential testing, anytime-valid inference**

- Simmons, J. P., Nelson, L. D., & Simonsohn, U. (2011). False-positive psychology. *Psychological Science*, 22(11), 1359–1366. https://doi.org/10.1177/0956797611417632
- Wald, A. (1945). Sequential tests of statistical hypotheses. *Annals of Mathematical Statistics*, 16(2), 117–186. https://doi.org/10.1214/aoms/1177731118
- Pocock, S. J. (1977). Group sequential methods in the design and analysis of clinical trials. *Biometrika*, 64(2), 191–199. https://doi.org/10.1093/biomet/64.2.191
- O'Brien, P. C., & Fleming, T. R. (1979). A multiple testing procedure for clinical trials. *Biometrics*, 35(3), 549–556. https://doi.org/10.2307/2530245
- Lan, K. K. G., & DeMets, D. L. (1983). Discrete sequential boundaries for clinical trials. *Biometrika*, 70(3), 659–663. https://doi.org/10.1093/biomet/70.3.659
- Grünwald, P., de Heide, R., & Koolen, W. (2024). Safe testing. *JRSS Series B*, 86(5), 1091–1128. https://doi.org/10.1093/jrsssb/qkae011
- Ramdas, A., Grünwald, P., Vovk, V., & Shafer, G. (2023). Game-theoretic statistics and safe anytime-valid inference. *Statistical Science*, 38(4), 576–601. https://doi.org/10.1214/23-STS894

**Severity, falsification, adversarial method**

- Mayo, D. G. (2018). *Statistical Inference as Severe Testing: How to Get Beyond the Statistics Wars*. Cambridge University Press. https://doi.org/10.1017/9781107286184
- Popper, K. R. (1959). *The Logic of Scientific Discovery*. London: Hutchinson.
- Popper, K. R. (1963). *Conjectures and Refutations: The Growth of Scientific Knowledge*. London: Routledge & Kegan Paul.
- Chamberlin, T. C. (1890). The method of multiple working hypotheses. *Science*, 15(366), 92–96. https://doi.org/10.1126/science.ns-15.366.92
- Platt, J. R. (1964). Strong inference. *Science*, 146(3642), 347–353. https://doi.org/10.1126/science.146.3642.347

**Generative discovery and its validation; funnel terminology**

- Swanson, D. R. (1986). Fish oil, Raynaud's syndrome, and undiscovered public knowledge. *Perspectives in Biology and Medicine*, 30(1), 7–18.
- DiGiacomo, R. A., Kremer, J. M., & Shah, D. M. (1989). Fish-oil dietary supplementation in patients with Raynaud's phenomenon: A double-blind, controlled, prospective study. *American Journal of Medicine*, 86(2), 158–164. https://pubmed.ncbi.nlm.nih.gov/2536517/
- Mathur, M. B., & VanderWeele, T. J. (2020). Sensitivity analysis for publication bias in meta-analyses. *JRSS Series C*, 69(5), 1091–1119. https://doi.org/10.1111/rssc.12440
- Egger, M., Davey Smith, G., Schneider, M., & Minder, C. (1997). Bias in meta-analysis detected by a simple, graphical test. *BMJ*, 315(7109), 629–634. https://doi.org/10.1136/bmj.315.7109.629

---

## 13. UNVERIFIED / could not confirm

Listed so that nothing above reads as more certain than it is.

1. **Mayo (2018) page numbers.** The severity quotations in §9.1 are reliable in wording — they are consistent across independent sources including Mayo's own posted excerpts of Excursion 1 (errorstatistics.com) — but the **book itself is paywalled and its pages were not retrieved**. Secondary sources variously cite p. 5, p. 14 and p. 23 for these passages. No pinpoint page citation is given here, and none should be published without checking a physical copy.
2. **The Simonsohn, Simmons & Nelson (2020) Publisher Correction.** Its existence and citation (*Nature Human Behaviour*, 4(11), 1215, DOI 10.1038/s41562-020-00974-w) are confirmed; **its content was not retrievable** (Nature paywall). Nothing in §3.2 depends on it, but a reader implementing SCA should check what it corrects.
3. **Tukey's exact wording.** The three quoted phrases in §1.1 ("an attitude, a flexibility, and a reliance on display, not a bundle of techniques"; "Neither exploratory nor confirmatory is sufficient alone. To try to replace either by the other is madness"; "forces us to notice what we never expected to see") are the standard renderings carried by secondary sources and by a scanned copy of the 1980 *American Statistician* paper. **The 1977 book was not read directly**, and the third phrase is attributed to the book in secondary literature rather than verified against it.
4. **Liben-Nowell & Kleinberg per-cell improvement factors.** The prose figures quoted in §6.1 (0.15%–0.48% random baseline; ~16% best precision; 6.1×, 18.0–41.1×, 71.2×, 147.0×; "not more than about seven" on STOC/FOCS) are verified. The commonly-cited "40–50× random" figure is **not printed as such in the paper**; it is arithmetically consistent with the best result (~16% precision against a 0.341% baseline ≈ 47×) but that division is ours, not theirs. Individual results-table cells could not be reliably attributed to specific predictor/dataset pairs because of the PDF's column-major layout. Numeric detail is drawn from Kleinberg's posted extended manuscript, which corresponds to the JASIST version; the 4-page CIKM version does not contain it all.
5. **Lichtenwalter & Chawla (2012), ASONAM full text.** The bibliographic record is confirmed; **the full text was not retrievable** (IEEE returned 403). All substantive claims attributed to this line of work in §6.3–6.4 are sourced from the 2015 *Knowledge and Information Systems* expansion, which the authors describe as "a substantial expansion" of the conference paper.
6. **Lichtenwalter, Lussier & Chawla (2010), KDD '10, "New perspectives and methods in link prediction"** (DOI 10.1145/1835804.1835837) advertises "formal bounds on imbalance in sparse network link prediction," which would be the ideal citation for §6.2. **The full text was not retrievable and the bound was not read**, so the paper is mentioned here rather than cited in the body.
7. **Milo et al. (2002) Supplementary Online Material** was not retrieved. No claim in §5.1 is sourced to it. The claims made about the 2002 method (P < 0.01, 1,000 randomisations, U ≥ 4 on disjoint node sets, nested null for tetrads, and the absence of the words "Bonferroni," "false discovery" or "correction") come from the main text.
8. **Rao, Jana & Bandyopadhyay (1996)**, *Sankhyā Series A*, 58(2), 225–242 — the canonical original for the swap chain as an MCMC sampler with fixed margins. Authors, volume and pages are corroborated by the reference lists of Fosdick et al. (2018) and Milo et al. (arXiv:cond-mat/0312028), but the paper is **absent from CrossRef and OpenAlex and no stable URL was confirmed.** It is not cited in the body.
9. **Swanson (1986) pagination.** *Perspectives in Biology and Medicine*, 30(1), 7–18 is the citation given consistently across the literature-based-discovery literature; the article itself was not retrieved and the volume/issue/pages are secondary-sourced. The subsequent trial (DiGiacomo et al., 1989) *is* verified.
10. **"Significance funnel."** The term as used in the meta-analysis literature (Mathur & VanderWeele, 2020) is verified and means something different from the discovery funnel described in §8. **The terms "discovery funnel" and "survival funnel" are this platform's own coinages and carry no citation.** §8.3 says so explicitly; it is repeated here so the distinction survives any future editing.
11. **No FDR-for-motif-census citation exists.** As stated in §5.6, this review could not locate a published method whose primary contribution is Benjamini–Hochberg or Bonferroni correction over the triad or tetrad census. The recommendation in §5.6 to apply Benjamini–Yekutieli over an enumerated motif family is **an inference from the general multiple-testing literature applied to this setting, not a cited practice.** It should be described that way in any published methodology.
12. **Efron's empirical-null recommendation for graph statistics** (§4.5) is likewise an extrapolation. Efron's papers concern microarray z-values; the application to motif z-scores in a corporate register is ours, is well-motivated by Fodor et al. (2020)'s finding that the Gaussian approximation is often unjustified, but is **not a cited result**.
13. **Attribute-stratified null models for corporate graphs** (§5.4, §9.2) are a recommendation derived from the Artzy-Randrup critique, not a method taken from a specific paper. The critique is verified; the corporate-registry implementation is a design proposal.
14. **Kannan, Tetali & Vempala (1999) title.** The citation and DOI are verified via CrossRef; the exact title wording was not confirmed against the article itself.
15. **Bollobás (1980) title.** As above — DOI and bibliographic record verified; title wording taken from the CrossRef record rather than the article.
