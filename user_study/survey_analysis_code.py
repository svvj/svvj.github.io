import pandas as pd
import json
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from scipy.stats import ttest_ind
import os

# Define output directory - change this variable to change all output locations
output_dir = "exp_data/pilot/output"

# Helper function to get path in the output directory
def get_output_path(filename):
    return os.path.join(output_dir, filename)

# Create the output directory if it doesn't exist
os.makedirs(output_dir, exist_ok=True)

print(f"All output files will be saved to: {os.path.abspath(output_dir)}")

# Set visualization styles
plt.style.use('seaborn-v0_8-whitegrid')
sns.set_context("talk")

# Load all survey response files
file_path = "C:/Users/wjdtm/Desktop/workspace/svvj.github.io/user_study/exp_data/pilot"
file_paths = list(Path(file_path).glob("*.json"))

all_data = []
participant_info = []

for path in file_paths:
    with open(path, "r") as f:
        data = json.load(f)
        print("Loading file:", path)
        
        # Extract participant information
        p_info = data.get("participantInfo", {})
        p_info['file'] = path.name
        participant_info.append(p_info)
        
        participant = p_info.get("name", path.stem)
        
        # Process all valid responses
        for qid, qdata in data.get("responses", {}).items():
            # Skip incomplete responses
            if not qdata.get("value"):
                continue
                
            all_data.append({
                "participant": participant,
                "render": qdata.get("render"),
                "object": qdata.get("object", ""),
                "num": qdata.get("num"),
                "question": qdata.get("question"),
                "value": int(qdata.get("value")),
                "timeSpent": int(qdata.get("timeSpent")),
                "question_id": qid
            })

# Create main dataframe
df = pd.DataFrame(all_data)

# Participant info dataframe
participants_df = pd.DataFrame(participant_info)
print(f"Loaded data from {len(participant_info)} participants")
print(f"Total responses: {len(df)}")

# Basic data exploration
print("\nParticipant Demographics:")
print(f"Age range: {participants_df['age'].min()}-{participants_df['age'].max()} years")
print(f"Gender distribution: {participants_df['gender'].value_counts().to_dict()}")

# Extract object and view information
df['object_name'] = df['object'].str.split('/', expand=True)[0]
df['view'] = df['object'].str.split('/', expand=True)[1]

# Define consistent view order
view_order = ["back", "side", "front", "top"]

# Create categorical variable for df only at this point
df['view_cat'] = pd.Categorical(df['view'], categories=view_order, ordered=True)

# Process 'even' type data
even_df = df[df['render'] == 'even'].copy()
# Extract reference and generated image counts from values like "N15RN20"
even_df[['cap_img', 'gen_img']] = even_df['num'].str.extract(r'N(\d+)RN(\d+)').astype(float)
even_df['cap_img'] = even_df['cap_img'].fillna(0)  # Some may have 0 reference images
even_df['gen_img'] = even_df['gen_img'].fillna(0)  # Some may have 0 generated images
even_df['augmentation_ratio'] = even_df.apply(
    lambda row: 0 if row['cap_img'] == 0 else row['gen_img'] / row['cap_img'], 
    axis=1
)

# Process bias conditions
bias_df = df[df['render'] == 'bias'].copy()
bias_df['cap_img'] = bias_df['num'].astype(int)
bias_df['gen_img'] = 0
bias_df["group"] = "bias"

bias_com_df = df[df['render'] == 'bias_com'].copy()
bias_com_df['gen_img'] = bias_com_df['num'].astype(int)
bias_com_df['cap_img'] = 100 - bias_com_df['gen_img']
bias_com_df["group"] = "bias_com"

# Combine bias conditions
bias_combined = pd.concat([bias_df, bias_com_df])

# NOW add the categorical variable for bias_combined AFTER it's created
bias_combined['view_cat'] = pd.Categorical(bias_combined['view'], categories=view_order, ordered=True)

sns.lmplot(data=even_df, x="gen_img", y="value", col="cap_img", ci=None,
           height=4, aspect=1.2, scatter_kws={"alpha": 0.5})
plt.subplots_adjust(top=0.85)
plt.suptitle("Evaluation score by Uniform Sampling")
plt.show()

plt.figure(figsize=(12, 6))
sns.boxplot(data=even_df, x="gen_img", y="value", hue="cap_img")
plt.title("Evaluation Scores by Uniform Sampling")
plt.xlabel("Number of Generated Images")
plt.ylabel("Evaluation Score")
plt.tight_layout()
plt.show()

bias_com_df[['object_name', 'view']] = bias_com_df['object'].str.split('/', expand=True)
bias_df[['object_name', 'view']] = bias_df['object'].str.split('/', expand=True)
bias_combined = pd.concat([bias_df, bias_com_df])

results = []
for view in bias_combined['view'].dropna().unique():
    a = bias_combined[(bias_combined['group'] == 'bias') & (bias_combined['view'] == view)]['value']
    b = bias_combined[(bias_combined['group'] == 'bias_com') & (bias_combined['view'] == view)]['value']
    if len(a) > 1 and len(b) > 1:
        t, p = ttest_ind(a, b, equal_var=False)
        results.append((view, a.mean(), b.mean(), t, p))
print("View-based t-tests:")
for r in results:
    print(f"View: {r[0]}, Bias mean: {r[1]:.2f}, Bias_com mean: {r[2]:.2f}, p = {r[4]:.4f}")

# Overall summary statistics
print("\nOverall Evaluation Scores:")
print(df.groupby('render')['value'].describe())

# Analyze questions separately (quality vs consistency)
question_types = df['question'].unique()
for q in question_types:
    q_subset = df[df['question'] == q]
    print(f"\nResults for question: {q}")
    print(q_subset.groupby(['render', 'object_name'])['value'].mean().unstack())

# Average scores per object/view by condition
pivot_scores = df.pivot_table(
    values='value', 
    index=['object_name', 'view'], 
    columns='render',
    aggfunc='mean'
)
print("\nAverage Scores by Object/View and Condition:")
print(pivot_scores.sort_values(by='bias', ascending=False))

# 1. Even condition analysis - reference vs generated image count effect
# replace the actual question text with Question 1, 2, 3, etc.
plt.figure(figsize=(14, 8))
for i, q in enumerate(question_types):
    plt.subplot(1, 2, i+1)
    q_data = even_df[even_df['question'] == q]
    
    # Create heatmap of scores by cap_img and gen_img counts
    pivot = q_data.pivot_table(
        values='value', 
        index='cap_img', 
        columns='gen_img', 
        aggfunc='mean'
    )
    
    sns.heatmap(pivot, annot=True, cmap='YlGnBu', fmt='.1f', 
                cbar_kws={'label': 'Average Score (1-5)'})
    plt.title(f"Even Condition: Question {i+1}")
    plt.xlabel('Generated Image Count')
    plt.ylabel('Reference Image Count')

plt.tight_layout()
plt.savefig(get_output_path('even_condition_heatmap.png'))
plt.show()

# 2. Bias conditions comparison
plt.figure(figsize=(15, 10))
for i, obj in enumerate(['chair', 'drums', 'toy', 'tape']):
    plt.subplot(2, 2, i+1)
    obj_data = bias_combined[bias_combined['object_name'] == obj]
    
    # Use view_cat instead of view to ensure consistent ordering
    sns.barplot(x='view_cat', y='value', hue='group', data=obj_data, 
                palette='Set2', errorbar=('ci', 95))
    
    plt.title(f"Scores for {obj.capitalize()}")
    plt.xlabel('View')
    plt.ylabel('Average Score')
    plt.ylim(0, 5)
    plt.legend(title='Condition')
    
plt.tight_layout()
plt.savefig(get_output_path('bias_conditions_by_object_view.png'))
plt.show()

# Perform statistical tests on different conditions

# Compare even rendering at different reference counts
print("\nStatistical comparison of reference image counts in EVEN condition:")
ref_counts = even_df['cap_img'].unique()
ref_counts.sort()

for i in range(len(ref_counts)):
    for j in range(i+1, len(ref_counts)):
        a = even_df[even_df['cap_img'] == ref_counts[i]]['value']
        b = even_df[even_df['cap_img'] == ref_counts[j]]['value']
        if len(a) > 1 and len(b) > 1:
            t, p = ttest_ind(a, b, equal_var=False)
            print(f"Ref images {ref_counts[i]} vs {ref_counts[j]}: t={t:.2f}, p={p:.4f}")

# Compare bias vs bias_com for each view
print("\nStatistical comparison of bias vs bias_com by view:")
for view in bias_combined['view'].dropna().unique():
    a = bias_combined[(bias_combined['group'] == 'bias') & (bias_combined['view'] == view)]['value']
    b = bias_combined[(bias_combined['group'] == 'bias_com') & (bias_combined['view'] == view)]['value']
    if len(a) > 1 and len(b) > 1:
        t, p = ttest_ind(a, b, equal_var=False)
        print(f"View: {view}, Bias mean: {a.mean():.2f}, Bias_com mean: {b.mean():.2f}, t={t:.2f}, p={p:.4f}")

# Compare different objects across all conditions
print("\nStatistical comparison of objects:")
objects = df['object_name'].unique()
for i in range(len(objects)):
    for j in range(i+1, len(objects)):
        a = df[df['object_name'] == objects[i]]['value']
        b = df[df['object_name'] == objects[j]]['value']
        if len(a) > 1 and len(b) > 1:
            t, p = ttest_ind(a, b, equal_var=False)
            print(f"{objects[i]} vs {objects[j]}: t={t:.2f}, p={p:.4f}")

# Export processed data for potential further analysis
even_df.to_csv(get_output_path('processed_even_data.csv'), index=False)
bias_combined.to_csv(get_output_path('processed_bias_data.csv'), index=False)

# Create a summary report with key findings
summary = {
    'participants': len(participant_info),
    'total_responses': len(df),
    'average_scores': {
        render: df[df['render'] == render]['value'].mean() 
        for render in df['render'].unique()
    },
    'time_spent': {
        render: df[df['render'] == render]['timeSpent'].mean() / 1000 
        for render in df['render'].unique()
    }
}

# Save summary as JSON
with open(get_output_path('summary_results.json'), 'w') as f:
    json.dump(summary, f, indent=2)

print("\nAnalysis complete! Results saved to disk.")

print("\n\n===== RESEARCH QUESTION ANALYSIS =====")

# --------- Research Question 1: Generative AI Impact on 3D Reconstruction ---------
print("\n1. Can Generative AI improve 3D reconstruction results?")

# Regression analysis on even condition data
from scipy import stats

# Analyze impact of generated image count on evaluation scores
print("\nImpact of generated image count on evaluation scores:")
slope, intercept, r_value, p_value, std_err = stats.linregress(even_df['gen_img'], even_df['value'])
print(f"Linear regression: slope={slope:.4f}, r-squared={r_value**2:.4f}, p-value={p_value:.4f}")



# --------- Research Question 2: Generative AI for Incomplete Coverage ---------
print("\n2. Can Generative AI improve 3D reconstruction for incomplete coverage?")

# Analyze augmented biased sampling (bias_com) trends
slope, intercept, r_value, p_value, std_err = stats.linregress(
    bias_com_df['gen_img'], bias_com_df['value'])
print(f"\nBiased+Augmentation trend: slope={slope:.4f}, r-squared={r_value**2:.4f}, p-value={p_value:.4f}")

# Compare bias vs bias_com by view
view_comparison = pd.DataFrame({
    'View': view_order,
    'Bias_Mean': [bias_combined[(bias_combined['group'] == 'bias') & 
                               (bias_combined['view'] == view)]['value'].mean() 
                  for view in view_order],
    'Bias_Com_Mean': [bias_combined[(bias_combined['group'] == 'bias_com') & 
                                    (bias_combined['view'] == view)]['value'].mean() 
                       for view in view_order],
    'Improvement': [bias_combined[(bias_combined['group'] == 'bias_com') & 
                                  (bias_combined['view'] == view)]['value'].mean() -
                    bias_combined[(bias_combined['group'] == 'bias') & 
                                  (bias_combined['view'] == view)]['value'].mean() 
                    for view in view_order]
})
print("\nComparison of bias vs augmented bias by view:")
print(view_comparison)

# Visualize comparison by view
plt.figure(figsize=(12, 6))
bar_width = 0.35
index = np.arange(len(view_order))

plt.bar(index, view_comparison['Bias_Mean'], bar_width, label='Biased Only', alpha=0.7)
plt.bar(index + bar_width, view_comparison['Bias_Com_Mean'], bar_width, 
        label='Biased + Augmentation', alpha=0.7)

plt.xlabel('View')
plt.ylabel('Average Score')
plt.title('Comparison of Biased vs Augmented Biased by View')
plt.xticks(index + bar_width/2, view_order)
plt.legend()
plt.tight_layout()
plt.savefig(get_output_path('bias_vs_bias_com_by_view.png'))
plt.show()


# Enhanced visualization comparing reference-only vs augmented approaches
plt.figure(figsize=(12, 10))

# Create a 2x2 grid of subplots - one for each view direction
for i, view in enumerate(view_order):
    ax = plt.subplot(2, 2, i+1)
    
    # Filter data for this specific view for both conditions
    bias_view_data = bias_df[bias_df['view'] == view]
    bias_com_view_data = bias_com_df[bias_com_df['view'] == view]
    
    if len(bias_com_view_data) > 0:
        # Plot augmented condition (bias_com) - average by captured image count
        avg_scores_com = bias_com_view_data.groupby('gen_img')['value'].mean().reset_index()
        plt.plot(avg_scores_com['gen_img'], avg_scores_com['value'], 'o-', 
                 color='blue', linewidth=2, markersize=8, label='With Augmentation')
        
        # Add regression line for augmented condition
        if len(bias_com_view_data) > 2:
            x = bias_com_view_data['gen_img']
            y = bias_com_view_data['value']
            z = np.polyfit(x, y, 1)
            p = np.poly1d(z)
            x_line = np.linspace(x.min(), min(x.max(), 50), 100)
            plt.plot(x_line, p(x_line), 'b--', linewidth=2)
    
    if len(bias_view_data) > 0:
        # Plot individual reference counts instead of just the mean
        ref_scores = bias_view_data.groupby('cap_img')['value'].mean().reset_index()
        
        # Plot each reference count as a separate point
        for _, row in ref_scores.iterrows():
            ref_count = row['cap_img']
            score = row['value']
            plt.scatter([ref_count], [score], color='red', s=100, zorder=10,
                       label='Reference Only' if _ == 0 else "")
            
            # Add text annotation for each reference count
            # plt.text(ref_count, score + 0.2, f"Ref {int(ref_count)}: {score:.2f}", 
            #         color='red', fontweight='bold', ha='center', va='bottom')
        
        # Connect the reference-only points with a line
        if len(ref_scores) > 1:
            plt.plot(ref_scores['cap_img'], ref_scores['value'], 'r-', linewidth=2)
    
    # Add annotation about total images
    plt.text(0.5, 0.05, "For augmented condition:\nTotal images = 100 (Captured + Generated)", 
            transform=ax.transAxes, ha='center',
            fontsize=10, fontstyle='italic',
            bbox=dict(facecolor='white', alpha=0.7, boxstyle='round'))
    
    # Consistent formatting for all subplots
    plt.title(f"{view.capitalize()} View", fontsize=14, fontweight='bold')
    plt.xlabel('Number of Captured Images', fontsize=12)
    plt.ylabel('Quality Score', fontsize=12)
    plt.ylim(0, 5.5)
    plt.xlim(-5, 65)  # Limit x-axis to 0-60 (with some padding)
    plt.grid(True, linestyle='--', alpha=0.7)
    
    # Only show legend on first subplot to avoid redundancy
    if i == 0:
        handles, labels = plt.gca().get_legend_handles_labels()
        # Remove duplicate labels
        unique_labels = []
        unique_handles = []
        for handle, label in zip(handles, labels):
            if label not in unique_labels:
                unique_labels.append(label)
                unique_handles.append(handle)
        plt.legend(unique_handles, unique_labels, loc='upper right')

plt.suptitle('Effect of Captured Image Count on Quality by View\nComparing Reference-Only vs Augmented Approach', 
            fontsize=16, y=1.05, fontweight='bold')
plt.tight_layout()
plt.subplots_adjust(top=0.88)
plt.savefig(get_output_path('bias_vs_augmented_comparison.png'), bbox_inches='tight')
plt.show()

# --------- Research Question 3: Additional Discussion Points ---------
print("\n3. Additional Discussion Points")

# Object complexity analysis - we'll use object type as a proxy for complexity
print("\nObject comparison:")

# Average scores by object complexity
complexity_scores = df.groupby(['object_name', 'render'])['value'].mean().unstack()
print(complexity_scores)

# Visualization of object complexity vs scores
plt.figure(figsize=(10, 6))
sns.barplot(x='object_name', y='value', hue='render', data=df, order=['chair', 'drums', 'toy', 'tape'])
plt.title('Evaluation Scores by Object')
plt.xlabel('Object')
plt.ylabel('Average Score')
plt.tight_layout()
plt.savefig(get_output_path('object_complexity_scores.png'))
plt.show()

# What do people prioritize in evaluation?
# Analyze different question types
print("\nEvaluation priorities (by question type):")
question_importance = df.groupby(['question', 'render'])['value'].mean().unstack()
print(question_importance)

# Time spent analysis as an indicator of evaluation attention
time_by_question = df.groupby(['question'])['timeSpent'].mean().sort_values(ascending=False)
print("\nTime spent by question type (ms):")
print(time_by_question)

# Most influential artifacts analysis
# For this we'll analyze view-based differences as a proxy for artifact influence
print("\nView-based score differences (potential artifact influence):")
view_artifact = df.groupby(['view_cat', 'object_name'])['value'].mean().unstack()
print(view_artifact)

# Create a correlation matrix to explore relationships
corr_matrix = df.pivot_table(
    values='value', 
    index=['participant'],
    columns=['view_cat', 'render'],
    aggfunc='mean'
)
plt.figure(figsize=(12, 10))
sns.heatmap(corr_matrix.corr(), annot=True, cmap='coolwarm', vmin=-1, vmax=1, 
            center=0, fmt='.2f', linewidths=0.5)
plt.title('Correlation Matrix: Views and Rendering Conditions')
plt.tight_layout()
plt.savefig(get_output_path('correlation_matrix.png'))
plt.show()

print("\nAnalysis complete! All research questions addressed.")



